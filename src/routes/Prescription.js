import express from "express";
import PrescriptionController from "../controllers/PrescriptionController.js";
const router = express.Router();
const prescriptionController = new PrescriptionController();

router.post("/createPrescription", prescriptionController.createPrescription.bind(prescriptionController));
router.get("/getPrescription", prescriptionController.getPrescriptions.bind(prescriptionController));
router.post("/editPrescription", prescriptionController.editPrescription.bind(prescriptionController));

export default router;