import express from "express";
import upload from "../services/multer.services.js";    
import DoctorController from "../controllers/doctorController.js";
import AppointmentController from "../controllers/appointmentController.js";
import PrescriptionController from "../controllers/PrescriptionController.js";
const router = express.Router();
const doctorController = new DoctorController();
const appointmentController = new AppointmentController();
const prescriptionController = new PrescriptionController();
// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), doctorController.EditProfile.bind(doctorController)); 
router.get("/getDoctor", doctorController.getdoctor.bind(doctorController));

router.post("/editAppointment", appointmentController.editAppointment.bind(appointmentController));
router.get("/getAppointment", appointmentController.getAppointments.bind(appointmentController));

    

router.post("/createPrescription", prescriptionController.createPrescription.bind(prescriptionController));
router.get("/getPrescription", prescriptionController.getPrescriptions.bind(prescriptionController));
router.post("/editPrescription", prescriptionController.editPrescription.bind(prescriptionController));

export default router;