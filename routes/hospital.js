import express from 'express';
import HospitalController from '../controllers/hospitalController.js';

const router = express.Router();
const hospitalController = new HospitalController();

router.post("/create", hospitalController.createHospital.bind(hospitalController));

export default router;
