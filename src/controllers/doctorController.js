import User from '../models/User.model.js';
import Appointment from '../models/Appointment.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import cloudinary from '../config/cloudinaryConfig.js';


class DoctorController {


    async EditProfile(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            // Determine the user ID based on the role
            const userId = req.user.role === "admin" ? req.params.id : req.user._id;

            // Find the user (doctor) by the determined ID
            const doctor = await User.findById(userId);
            if (!doctor) {
                await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found", 0);
            }

            // Handle profile picture update
            if (req.files?.profilePicture?.[0]?.path) {
                if (doctor.profilePicture && doctor.profilePicture !== "") {
                    const publicId = doctor.profilePicture.split("/").pop().split(".")[0];
                    await cloudinary.uploader.destroy(`profileImages/${publicId}`);
                }
                req.body.profilePicture = req.files.profilePicture[0].path;
            }

            // Update the doctor profile
            const updatedDoctor = await User.findByIdAndUpdate(userId, req.body, { new: true });
            if (updatedDoctor) {
                return ResponseService.send(res, StatusCodes.OK, "Doctor profile updated successfully", 1, updatedDoctor);
            } else {
                await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update doctor profile", 0);
            }
        } catch (error) {
            await this.deleteImage(req.files?.profilePicture?.[0]?.path);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async getdoctor(req, res) {
        try { 
            if (!req.query.id) {
                const doctors = await User.find({ role: 'doctor', isActive: true });
                if (doctors.length > 0) {
                    return ResponseService.send(res, StatusCodes.OK, "Doctors fetched successfully", 1, doctors);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "No doctors found", 0);
                }
            } else {
                const doctor = await User.findOne({ _id: req.query.id, role: 'doctor' })
                    .populate("hospitalId", "name worksiteLink address country state city zipcode emergencyContactNo");
    
                if (doctor) {
                    let formattedHospitalDetails = null;
    
                    if (doctor.hospitalId) {
                        const hospital = doctor.hospitalId;
                        const formattedAddress = `${hospital.address || "N/A"}, ${hospital.city || "N/A"}, ${hospital.state || "N/A"}, ${hospital.country || "N/A"}, ${hospital.zipcode || "N/A"}`;
    
                        // Create a formatted hospital object with the additional address
                        formattedHospitalDetails = {
                            ...hospital.toObject(),
                            formattedAddress,
                        };
                    }
    
                    // Attach the formatted hospital details to the response
                    const doctorWithFormattedHospital = {
                        ...doctor.toObject(),
                        hospitalId: formattedHospitalDetails,
                    };
    
                    return ResponseService.send(res, StatusCodes.OK, "Doctor fetched successfully", 1, doctorWithFormattedHospital);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch doctor", 0);
                }
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }
    


    async deleteImage(path) {
        if (path) {
            const publicId = path.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`profileImages/${publicId}`);
        }
    };

    // async getPatientRecord(req, res) {
    //     try {
    //         // Extract the doctor's ID from the request (assume authentication middleware sets req.user)
    //         const Doctorid = req.user._id;
    
    //         // Fetch the doctor's appointments with populated patient details
    //         const appointments = await Appointment.find({ doctorId: Doctorid })
    //             .populate("patientId", "fullName age gender profilePicture") // Populate specific fields
    //             .limit(10); // Consider making this limit configurable
    
    //         // Handle case where no appointments exist for the doctor
    //         if (!appointments || appointments.length === 0) {
    //             return ResponseService.send(res, StatusCodes.BAD_REQUEST, "No appointments found for this doctor", 0);
    //         }
    
    //         // Map and format the patient records
    //         const patientRecords = appointments.map((appointment, index) => {
    //             const patient = appointment.patientId;
    
    //             return {
    //                 key: (index + 1).toString(), // Generate a unique key for each record
    //                 patientName: patient?.fullName || "N/A",
    //                 patientId: patient?._id || "N/A",
    //                 avatar: patient?.profilePicture || "https://vectorified.com/images/default-user-icon-33.jpg",
    //                 diseaseName: appointment.dieseas_name || "N/A",
    //                 patientIssue: appointment.patient_issue || "N/A",
    //                 lastAppointmentDate: new Date(appointment.date).toLocaleDateString("en-US", {
    //                     day: "2-digit",
    //                     month: "short",
    //                     year: "numeric",
    //                 }),
    //                 lastAppointmentTime: appointment.appointmentTime || "N/A",
    //                 age: patient?.age ? `${patient.age} Years` : "N/A",
    //                 gender: patient?.gender || "N/A",
    //             };
    //         });
    
    //         // Respond with the formatted records
    //         return ResponseService.send(res,StatusCodes.OK,"Patient records fetched successfully","success",patientRecords , 1);
    //     } catch (error) {
    //         console.error("Error fetching patient records:", error.message);
    //         return ResponseService.send(res,StatusCodes.INTERNAL_SERVER_ERROR,"An error occurred while fetching patient records",0);
    //     }
    // }
    
    async getPatientRecord(req, res) {
        try {
            // Extract the doctor's ID from the request (assume authentication middleware sets req.user)
            const Doctorid = req.user._id;
            const { filter } = req.query; // `filter` is optional
    
            // Define the date range for filtering
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of the day
    
            let startDate = null; // Default is no date filter
            let endDate = null;
    
            if (filter === "day") {
                startDate = new Date(today); // Start of today
                endDate = new Date(today);
                endDate.setDate(today.getDate() + 1); // End of today
            } else if (filter === "week") {
                const dayOfWeek = today.getDay(); // Current day of the week (0 = Sunday, 6 = Saturday)
                startDate = new Date(today);
                startDate.setDate(today.getDate() - dayOfWeek); // Start of the week (Sunday)
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 7); // End of the week (Saturday)
            } else if (filter === "month") {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start of the month
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // Start of next month
            }
    
            // Build the query with optional date range
            const query = { doctorId: Doctorid };
            if (startDate && endDate) {
                query.date = { $gte: startDate, $lt: endDate };
            }
    
            // Fetch the doctor's appointments
            const appointments = await Appointment.find(query)
                .populate("patientId", "fullName age gender profilePicture") // Populate specific fields
                .limit(10); // Consider making this limit configurable
    
            // Handle case where no appointments exist for the doctor
            if (!appointments || appointments.length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "No appointments found for this doctor", 0);
            }
    
            // Map and format the patient records
            const patientRecords = appointments.map((appointment, index) => {
                const patient = appointment.patientId;
    
                return {
                    key: (index + 1).toString(), // Generate a unique key for each record
                    patientName: patient?.fullName || "N/A",
                    patientId: patient?._id || "N/A",
                    avatar: patient?.profilePicture || "https://vectorified.com/images/default-user-icon-33.jpg",
                    diseaseName: appointment.dieseas_name || "N/A",
                    patientIssue: appointment.patient_issue || "N/A",
                    lastAppointmentDate: new Date(appointment.date).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    }),
                    lastAppointmentTime: appointment.appointmentTime || "N/A",
                    age: patient?.age ? `${patient.age} Years` : "N/A",
                    gender: patient?.gender || "N/A",
                };
            });
    
            // Respond with the formatted records
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
                return ResponseService.send(res,StatusCodes.NOT_FOUND,"No appointment found for this patient",0);
            }
    
            const patient = latestAppointment.patientId;
            const doctor = latestAppointment.doctorId;
    
            // Reformat address to a single-line string
            const address = patient.address
                ? `${patient.address.fullAddress || ""}, ${patient.address.city || ""}, ${
                      patient.address.state || ""
                  }, ${patient.address.country || ""}, ${patient.address.zipCode || ""}`
                      .replace(/,\s*,/g, ",")
                      .trim(", ")
                : "N/A";
    
            // Fetch all appointments for the patient with the current doctor
            const allAppointments = await Appointment.find({ patientId, doctorId: req.user._id }).select(
                "dieseas_name patient_issue date appointmentTime type"
            );
    
            // Format response
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
                height: patient.metaData.patientData.height ? `${patient.metaData.patientData.height} cm` : "N/A",
                weight: patient.metaData.patientData.weight ? `${patient.metaData.patientData.weight} kg` : "N/A",
                bloodGroup: patient.metaData.patientData.bloodGroup || "N/A",
                dob: patient.metaData.patientData.dob
                    ? new Date(patient.dob).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                      })
                    : "N/A",
                appointmentType: latestAppointment.type || "N/A",
                address,
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
            return ResponseService.send(res,StatusCodes.OK,"Patient record fetched successfully","success",response , 1);
        } catch (error) {
            console.error("Error fetching patient record:", error);
            return ResponseService.send(res,StatusCodes.INTERNAL_SERVER_ERROR,"An error occurred while fetching patient record",0);
        }
    }

}

export default DoctorController;
