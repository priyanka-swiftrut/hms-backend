import { StatusCodes } from 'http-status-codes';
import Hospital from '../models/Hospital.model.js';
import ResponseService from '../services/response.services.js';
import cloudinary from 'cloudinary';

class HospitalController {
    // Create a new hospital
    async createHospital(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                if (req.files?.hospitalLogo?.[0]?.path) {
                    await this.deleteImage(req.files.hospitalLogo[0].path);
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            const existingHospital = await Hospital.findOne({ name: req.body.name });

            // Handle the case where the hospital already exists
            if (existingHospital) {
                if (req.files?.hospitalLogo?.[0]?.path) {
                    const publicId = req.files.hospitalLogo[0].path.split("/").pop().split(".")[0];
                    await cloudinary.uploader.destroy(`hospitalLogoImages/${publicId}`);
                }
                req.body.hospitalLogo = req.files?.hospitalLogo[0]?.path;
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Hospital name already exists", 0);
            }

            // Create a new hospital
            const hospital = new Hospital(req.body);
            await hospital.save();

            if (hospital) {
                return ResponseService.send(res, StatusCodes.OK, "Hospital created successfully", 1, hospital);
            } else {
                if (req.files?.hospitalLogo?.[0]?.path) {
                    await this.deleteImage(req.files.hospitalLogo[0].path);
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to add hospital", 0);
            }
        } catch (error) {
            // Handle errors and ensure images are deleted if an error occurs
            if (req.files?.hospitalLogo?.[0]?.path) {
                await this.deleteImage(req.files.hospitalLogo[0].path);
            }
            console.error('Error creating hospital:', error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    // Get hospitals or a specific hospital by ID
    async getHospitals(req, res) {
        try {
            const { id } = req.query;

            if (!id) {
                const hospitals = await Hospital.find();
                if (hospitals?.length > 0) {
                    return ResponseService.send(res, StatusCodes.OK, "Hospitals fetched successfully", 1, hospitals);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch hospitals", 0);
                }
            }

            const hospital = await Hospital.findById(id);
            if (hospital) {
                return ResponseService.send(res, StatusCodes.OK, "Hospital fetched successfully", 1, hospital);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch hospital", 0);
            }
        } catch (error) {
            console.error('Error fetching hospitals:', error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    // Delete an image from cloudinary
    async deleteImage(path) {
        if (path) {
            const publicId = path.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`profileImages/${publicId}`);
        }
    }
}

export default HospitalController;