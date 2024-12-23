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
                return sendResponse(res, 200, "Hospital created successfully", 1, hospital);
            } else {
                return sendResponse(res, 400, "Failed to add Hospital", 0);
            }
        } catch (error) {
            return sendResponse(res, 400, error.message, 'error');
        }
    }
}

export default HospitalController;