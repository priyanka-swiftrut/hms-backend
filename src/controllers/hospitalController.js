import { StatusCodes } from 'http-status-codes';
import Hospital from '../models/Hospital.model.js';
import sendResponse from '../services/response.services.js';

class HospitalController {

    async createHospital(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return res.status(400).json({ message: "Request body is empty", status: 0 });
            }
            let existingHospital = await Hospital.findOne({ name: req.body.name });
            if (existingHospital) return sendResponse(res, 400, "Hospital name already exists", 0);

            if (req.files && req.files.hospitalLogo && req.files.hospitalLogo[0] && req.files.hospitalLogo[0].path) {
                req.body.hospitalLogo = req.files.hospitalLogo[0].path;
            }
            const hospital = new Hospital(req.body);
            await hospital.save();
            if (hospital) {
                return sendResponse(res, StatusCodes.OK, "Hospital created successfully", 1, hospital);
            } else {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to add Hospital", 0);
            }
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async getHospitals(req, res) {
        try {
            if (req.query.id === '' || req.query.id === undefined || req.query.id === null) {
                const hospitals = await Hospital.find();
                if (hospitals) {
                    return sendResponse(res, StatusCodes.OK, "Hospitals fetched successfully", 1, hospitals);
                } else {
                    return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to fetch Hospitals", 0);
                }
            }
            else {
                const hospital = await Hospital.findById(req.params.id);
                if (hospital) {
                    return sendResponse(res, StatusCodes.OK, "Hospital fetched successfully", 1, hospital);
                } else {
                    return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to fetch Hospital", 0);
                }
            }
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }
}

export default HospitalController;