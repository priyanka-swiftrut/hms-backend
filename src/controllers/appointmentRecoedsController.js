import AppointmentRecord from "../models/appointmentRecord.model.js";
import appointmentmodel from "../models/Appointment.model.js";
import ResponseService from "../services/response.services.js";
import { StatusCodes } from "http-status-codes";
import cloudinary from "../config/cloudinaryConfig.js";

class AppointmentRecordController {

    // Create Appointment Record
    async createAppointmentRecord(req, res) {
        try {
            const { appointmentId } = req.params;
            const { description } = req.body;
            console.log();
            
            if (!appointmentId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment ID is required.", 0);
            }

            if (!req.body || Object.keys(req.body).length === 0) {
                // If no body is provided, delete the images if any exist in req.files
                const imagePaths = req.files?.profilePicture ? req.files.profilePicture.map(file => file.path) : [];
                if (imagePaths.length > 0) {
                    await this.deleteImage(imagePaths); // Delete all images if any are present
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            let appointment = await appointmentmodel.findOne({ _id: appointmentId });
            console.log(appointment);

            if (!appointment) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment not found.", 0);
            }

            const existingRecord = await AppointmentRecord.findOne({ appointmentId });
            console.log(existingRecord);
            
            if (existingRecord) {
                return ResponseService.send(res, StatusCodes.CONFLICT, "Appointment record already exists.", 0);
            }

            const images = req.files ? req.files.map(file => file.path) : [];

            const newRecord = new AppointmentRecord({
                appointmentId,
                hospitalId: appointment.hospitalId,
                doctorId: appointment.doctorId,
                patientId: appointment.patientId,
                description,
                images,
                date: new Date(),
            });

            await newRecord.save();

            return ResponseService.send(res, StatusCodes.CREATED, "Appointment record created successfully.", 1, newRecord);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    // Edit Appointment Record
    async editAppointmentRecord(req, res) {
        try {
            const { appointmentId, recordId } = req.params; // Extract appointmentId and recordId from params
            const { description, existingImages } = req.body;
    
            const record = await AppointmentRecord.findById(recordId); // Find the record by recordId
            if (!record) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment record not found.", 0);
            }
    
            // Update description if provided
            if (description) {
                record.description = description;
            }
            
            

            // If images are to be updated:
            const newImages = req.files ? req.files.map(file => file.path) : [];
    
            // If there are new images, replace the existing ones:
            if (newImages.length > 0) {
                // Delete old images if applicable (you can integrate Cloudinary deletion here if using it for image storage)
                // Example: assuming you have a function deleteImages() that deletes images from Cloudinary or the file system:
                if (record.images.length > 0) {
                    await deleteImages(record.images); // Remove old images before saving new ones
                }
                // Replace with new images
                record.images = newImages;
            } else if (existingImages && existingImages.length > 0) {
                // If there are no new images, keep the existing images provided in the request
                record.images = existingImages;
            }
    
            // Save the updated record
            await record.save();
    
            return ResponseService.send(res, StatusCodes.OK, "Appointment record updated successfully.", 1, record);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    // Delete Image from Record
    async deleteImage(req, res) {
        try {
            const { appointmentId } = req.params;
            const { imageUrl } = req.body;

            const record = await AppointmentRecord.findOne({ appointmentId });
            if (!record) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment record not found.", 0);
            }

            if (!imageUrl || !record.images.includes(imageUrl)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Image not found in the record.", 0);
            }

            // Remove image from Cloudinary
            const publicId = imageUrl.split('/').pop().split('.')[0]; // Extract public_id from URL
            await cloudinary.uploader.destroy(publicId);

            // Remove image from the record
            record.images = record.images.filter(img => img !== imageUrl);
            await record.save();

            return ResponseService.send(res, StatusCodes.OK, "Image deleted successfully.", 1, record);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async getAppointmentRecord(req, res) {
        try {
            const { appointmentId } = req.params;

            const record = await AppointmentRecord.findOne({ appointmentId });
            if (!record) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment record not found.", 0);
            }
            return ResponseService.send(res, StatusCodes.OK, "Appointment record fetched successfully.", 1, record);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }
    async deleteImage(paths) {
        if (paths) {
            // If paths is an array, loop through each one and delete
            if (Array.isArray(paths)) {
                for (const path of paths) {
                    const publicId = path.split("/").pop().split(".")[0];
                    await cloudinary.uploader.destroy(`profileImages/${publicId}`);
                }
            } else {
                // If it's a single image, delete it
                const publicId = paths.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`profileImages/${publicId}`);
            }
        }
    }
}

export default  AppointmentRecordController;