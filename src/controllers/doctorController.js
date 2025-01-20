import User from '../models/User.model.js';
import Appointment from '../models/Appointment.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import cloudinary from '../config/cloudinaryConfig.js';
import sendNotification from '../services/notificationService.js';
import jwt from 'jsonwebtoken';
import deleteImage from '../services/deleteImagesServices.js';


class DoctorController {


    async EditProfile(req, res) {
        try {
            // Check if request body is empty
            if (!req.body || Object.keys(req.body).length === 0) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files?.profilePicture?.[0]?.path, 'profileImages');
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
    
            // Determine the user ID based on the role
            const userId = req.user.role === "admin" ? req.params.id : req.user._id;
    
            // Find the user (doctor) by the determined ID
            const doctor = await User.findById(userId);
            if (!doctor) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files?.profilePicture?.[0]?.path, 'profileImages');
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found", 0);
            }
    
            // Handle fullName if firstName and lastName are provided
            if (req.body.firstName && req.body.lastName) {
                req.body.fullName = `${req.body.firstName} ${req.body.lastName}`;
            }
    
            // Handle profile picture update
            if (req.files?.profilePicture?.[0]?.path) {
                if (doctor.profilePicture && doctor.profilePicture !== "") {
                    const publicId = doctor.profilePicture.split("/").pop().split(".")[0];
                    await cloudinary.uploader.destroy(`profileImages/${publicId}`);  // Delete the old image
                }
                req.body.profilePicture = req.files.profilePicture[0].path;
            }
    
            // Restructure address fields
            if (req.body.country || req.body.state || req.body.city || req.body.zipCode || req.body.fullAddress) {
                req.body.address = {
                    country: req.body.country || doctor.address?.country,
                    state: req.body.state || doctor.address?.state,
                    city: req.body.city || doctor.address?.city,
                    zipCode: req.body.zipCode || doctor.address?.zipCode,
                    fullAddress: req.body.fullAddress || doctor.address?.fullAddress,
                };
            }
    
            // Restructure doctorData (metaData)
            if (req.body.hospitalName || req.body.specialization || req.body.qualification || req.body.experience) {
                req.body.metaData = {
                    ...doctor.metaData, 
                    doctorData: {
                        ...doctor.metaData?.doctorData, 
                        hospitalName: req.body.hospitalName || doctor.metaData?.doctorData?.hospitalName,
                        specialization: req.body.specialization || doctor.metaData?.doctorData?.specialization,
                        qualification: req.body.qualification || doctor.metaData?.doctorData?.qualification,
                        experience: req.body.experience || doctor.metaData?.doctorData?.experience,
                    },
                };
            }
    
            // Update the doctor profile
            const updatedDoctor = await User.findByIdAndUpdate(userId, req.body, { new: true });
            if (updatedDoctor) {
                const token = jwt.sign({ userData: updatedDoctor }, process.env.JWT_SECRET_DOCTOR, { expiresIn: "1d" });
    
                // Prepare response data with token
                const responseData = {
                    ...updatedDoctor._doc, 
                    token, 
                };
    
                await sendNotification({
                    type: 'EDIT profile',
                    message: `Your profile has been updated successfully.`,
                    hospitalId: doctor.hospitalId,
                    targetUsers: doctor.id,
                });
    
                return ResponseService.send(res, StatusCodes.OK, "Doctor profile updated successfully", 1, responseData);
            } else {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files?.profilePicture?.[0]?.path, 'profileImages');
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update doctor profile", 0);
            }
        } catch (error) {
            if (req.files?.profilePicture?.[0]?.path) {
                await deleteImage(req.files?.profilePicture?.[0]?.path, 'profileImages');
            }
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }
    

    async getdoctor(req, res) {
        try {
            const { id } = req.query;
    
            // Fetch all active doctors if no ID is provided
            if (!id) {
                const doctors = await User.find({ role: 'doctor', isActive: true });
    
                return doctors.length > 0
                    ? ResponseService.send(res, StatusCodes.OK, "Doctors fetched successfully", 1, doctors)
                    : ResponseService.send(res, StatusCodes.BAD_REQUEST, "No doctors found", 0);
            }
    
            // Fetch a specific doctor based on the provided ID
            const doctor = await User.findOne({ _id: id, role: 'doctor' })
                .populate("hospitalId", "name worksiteLink address country state city zipcode emergencyContactNo");
    
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found", 0);
            }
    
            // Format hospital details if available
            const formattedHospitalDetails = doctor.hospitalId
                ? {
                    ...doctor.hospitalId.toObject(),
                    formattedAddress: [
                        doctor.hospitalId.address || "N/A",
                        doctor.hospitalId.city || "N/A",
                        doctor.hospitalId.state || "N/A",
                        doctor.hospitalId.country || "N/A",
                        doctor.hospitalId.zipcode || "N/A",
                    ].join(", "),
                }
                : null;
    
            // Attach the formatted hospital details to the doctor object
            const doctorWithFormattedHospital = {
                ...doctor.toObject(),
                hospitalId: formattedHospitalDetails,
            };
    
            return ResponseService.send(
                res,
                StatusCodes.OK,
                "Doctor fetched successfully",
                1,
                doctorWithFormattedHospital
            );
        } catch (error) {
            return ResponseService.send(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                error.message,
                0
            );
        }
    }
    


    async deleteImage(path) {
        if (path) {
            const publicId = path.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`profileImages/${publicId}`);
        }
    };

    async getsinglepatientrecord(req, res) {
        try {
            const { patientId } = req.params;
    
            // Fetch the most recent appointment for the patient
            const latestAppointment = await Appointment.findOne({ patientId })
                .populate(
                    "patientId",
                    "fullName phone profilePicture gender age address metaData.patientData.dob metaData.patientData.weight metaData.patientData.height metaData.patientData.bloodGroup"
                )
                .populate("doctorId", "fullName")
                .sort({ date: -1 })
                .exec();
    
            // If no appointment is found
            if (!latestAppointment) {
                return ResponseService.send(
                    res,
                    StatusCodes.NOT_FOUND,
                    "No appointment found for this patient",
                    0
                );
            }
    
            const { patientId: patient, doctorId: doctor } = latestAppointment;
    
            // Format address to a single-line string
            const formattedAddress = patient.address
                ? [
                    patient.address.fullAddress || "",
                    patient.address.city || "",
                    patient.address.state || "",
                    patient.address.country || "",
                    patient.address.zipCode || "",
                ]
                    .filter(Boolean)
                    .join(", ")
                : "N/A";
    
            // Fetch all appointments for the patient with the current doctor
            const allAppointments = await Appointment.find({
                patientId,
                doctorId: req.user._id,
            }).select("dieseas_name patient_issue date appointmentTime type");
    
            // Format the response
            const response = {
                profilePicture: patient.profilePicture || "https://vectorified.com/images/default-user-icon-33.jpg",
                patientFullName: patient.fullName || "N/A",
                phone: patient.phone || "N/A",
                patientIssue: latestAppointment.patient_issue || "N/A",
                gender: patient.gender || "N/A",
                lastAppointmentDate: latestAppointment.date
                    ? new Date(latestAppointment.date).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                      })
                    : "N/A",
                doctorName: doctor.fullName || "N/A",
                age: patient.age ? `${patient.age} Years` : "N/A",
                height: patient.metaData?.patientData?.height
                    ? `${patient.metaData.patientData.height} cm`
                    : "N/A",
                weight: patient.metaData?.patientData?.weight
                    ? `${patient.metaData.patientData.weight} kg`
                    : "N/A",
                bloodGroup: patient.metaData?.patientData?.bloodGroup || "N/A",
                dob: patient.metaData?.patientData?.dob
                    ? new Date(patient.metaData.patientData.dob).toLocaleDateString(
                          "en-US",
                          {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                          }
                      )
                    : "N/A",
                appointmentType: latestAppointment.type || "N/A",
                address: formattedAddress,
                lastAppointmentTime: latestAppointment.appointmentTime || "N/A",
                allAppointments: allAppointments.map((appointment) => ({
                    dieseasName: appointment.dieseas_name || "N/A",
                    patientIssue: appointment.patient_issue || "N/A",
                    appointmentDate: appointment.date
                        ? new Date(appointment.date).toLocaleDateString("en-US", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                          })
                        : "N/A",
                    appointmentTime: appointment.appointmentTime || "N/A",
                    appointmentType: appointment.type || "N/A",
                    appointmentId: appointment._id,
                })),
            };
    
            // Send the response
            return ResponseService.send(
                res,
                StatusCodes.OK,
                "Patient record fetched successfully",
                "success",
                response,
                1
            );
        } catch (error) {
            console.error("Error fetching patient record:", error);
            return ResponseService.send(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                "An error occurred while fetching patient record",
                0
            );
        }
    }



    async getPatientRecord(req, res) {
        try {
            const { role, _id: userId, hospitalId } = req.user;
            const { filter, search } = req.query;
    
            // Initialize query based on user role
            let query = {};
            if (role === "doctor") {
                query.doctorId = userId;
            } else if (role === "receptionist") {
                query.hospitalId = hospitalId;
            } else {
                return ResponseService.send(
                    res,
                    StatusCodes.FORBIDDEN,
                    "You are not authorized to view patient records",
                    0
                );
            }
    
            // Date range filtering
            const today = new Date();
            today.setHours(0, 0, 0, 0);
    
            let startDate = null;
            let endDate = null;
    
            switch (filter) {
                case "day":
                    startDate = new Date(today);
                    endDate = new Date(today);
                    endDate.setDate(today.getDate() + 1);
                    break;
                case "week":
                    const dayOfWeek = today.getDay();
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - dayOfWeek);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 7);
                    break;
                case "month":
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                    break;
            }
    
            if (startDate && endDate) {
                query.date = { $gte: startDate, $lt: endDate };
            }
    
            // Fetch appointments without applying search filters yet
            const appointments = await Appointment.find(query)
                .populate("patientId", "fullName age gender profilePicture")
                .limit(10);
    
            if (!appointments?.length) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "No appointments found", 0);
            }
    
            // Apply search filter (case-insensitive)
            const filteredAppointments = search
                ? appointments.filter(({ patientId }) =>
                      new RegExp(`^${search}`, "i").test(patientId?.fullName || "")
                  )
                : appointments;
    
            if (!filteredAppointments.length) {
                return ResponseService.send(
                    res,
                    StatusCodes.BAD_REQUEST,
                    "No appointments found matching the search criteria",
                    0
                );
            }
    
            // Map filtered appointments to patient records
            const patientRecords = filteredAppointments.map((appointment, index) => {
                const patient = appointment.patientId;
    
                return {
                    key: `${index + 1}`,
                    patientName: patient?.fullName || "N/A",
                    patientId: patient?._id || "N/A",
                    avatar: patient?.profilePicture || "https://vectorified.com/images/default-user-icon-33.jpg",
                    diseaseName: appointment.disease_name || "N/A",
                    patientIssue: appointment.patient_issue || "N/A",
                    lastAppointmentDate: appointment.date
                        ? new Date(appointment.date).toLocaleDateString("en-US", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                          })
                        : "N/A",
                    lastAppointmentTime: appointment.appointmentTime || "N/A",
                    age: patient?.age ? `${patient.age} Years` : "N/A",
                    gender: patient?.gender || "N/A",
                };
            });
    
            // Send the response
            return ResponseService.send(
                res,
                StatusCodes.OK,
                "Patient records fetched successfully",
                "success",
                patientRecords,
                1
            );
        } catch (error) {
            console.error("Error fetching patient records:", error.message);
            return ResponseService.send(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                "An error occurred while fetching patient records",
                0
            );
        }
    }
    
}

export default DoctorController;
