import User from '../models/User.model.js';
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

}

export default DoctorController;
