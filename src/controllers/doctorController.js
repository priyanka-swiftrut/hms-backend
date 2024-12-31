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
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }
    async getdoctor(req, res) {
        try {
            if (req.query.id === '' || req.query.id === undefined || req.query.id === null) {
                const doctor = await User.find({ role: 'doctor', isActive: true });
                if (doctor) {
                    return ResponseService.send(res, StatusCodes.OK, "doctor fetched successfully", 1, doctor);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch doctor", 0);
                }
            }
            else {
                const doctor = await User.findById({ _id: req.query.id, role: 'doctor' });
                if (doctor) {
                    return ResponseService.send(res, StatusCodes.OK, "doctor fetched successfully", 1, doctor);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch doctor", 0);
                }
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async deleteImage(path) {
        if (path) {
            const publicId = path.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`profileImages/${publicId}`);
        }
    };


    async getPatientRecord(req, res) {
        try {
            // Extract the doctor's ID from the request (assuming it's passed as a query parameter)
            const Doctorid = req.user._id;
            console.log(Doctorid);

            // Get the appointments related to the specific doctor
            const appointments = await Appointment.find({ doctorId: Doctorid })
                .populate("patientId", "fullName age gender") // Populate patient info from the User model
                .limit(10); // Limit to the last 10 appointments, or as needed

            // If no appointments are found
            if (!appointments || appointments.length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "No appointments found for this doctor", 0);
            }

            // Format the data to return
            const patientRecords = appointments.map((appointment) => {
                const patient = appointment.patientId;

                return {
                    patientName: patient.fullName,
                    diseaseName: appointment.dieseas_name,
                    patientIssue: appointment.patient_issue,
                    lastAppointmentDate: appointment.date.toDateString(),
                    lastAppointmentTime: appointment.appointmentTime,
                    age: patient.age,
                    gender: patient.gender,
                };
            });

            // Return the formatted patient records
            res.status(200).json(patientRecords);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" }, 0);
        }
    }


}

export default DoctorController;
