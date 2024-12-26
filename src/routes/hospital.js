import express from 'express';
import HospitalController from '../controllers/hospitalController.js';
import upload from '../services/multer.services.js';
const router = express.Router();
const hospitalController = new HospitalController();

router.post("/createHospital", upload.fields([{ name: 'hospitalLogo', maxCount: 1 }]), hospitalController.createHospital.bind(hospitalController));
router.get("/getHospitals", hospitalController.getHospitals.bind(hospitalController));
export default router;
