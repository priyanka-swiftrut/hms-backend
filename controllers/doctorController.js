import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import cloudinary from '../config/cloudinaryConfig.js';
import crypto from 'crypto';
import EmailService from '../services/email.service.js';


class DoctorController {

    
    async EditProfile(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            const doctor = await User.findById(req.user._id);
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "doctor not found", 0);
            }
            if (req.files) {
                if (req.files?.profilePicture?.[0]?.path) {
                    if (doctor.profilePicture && doctor.profilePicture !== "") {
                        const publicId = doctor.profilePicture.split("/").pop().split(".")[0];
                        await cloudinary.uploader.destroy(`profileImages/${publicId}`);
                    }
                    req.body.profilePicture = req.files.profilePicture[0].path;
                }
            }
            const updatedoctor = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
            if (updatedoctor) {
                return ResponseService.send(res, StatusCodes.OK, "doctor profile updated successfully", 1, updatedoctor);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update doctor profile", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }


}

export default DoctorController;
