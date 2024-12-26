import express from "express";
import PatientController from "../controllers/patientController.js";
import AppointmentController from "../controllers/appointmentController.js";
import PrescriptionController from "../controllers/PrescriptionController.js";
import upload from "../services/multer.services.js";    
const router = express.Router();
const patientController = new PatientController();
const appointmentController = new AppointmentController();
const prescriptionController = new PrescriptionController();
// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), patientController.EditProfile.bind(patientController));      
router.delete("/delete/:id", patientController.deleteProfile.bind(patientController));
router.get("/getpatients", patientController.getPatients.bind(patientController));

router.post("/createAppointment", appointmentController.createAppointment.bind(appointmentController));
router.post("/editAppointment", appointmentController.editAppointment.bind(appointmentController));
router.get("/getAppointment", appointmentController.getAppointments.bind(appointmentController));


router.get("/getPrescription", prescriptionController.getPrescriptions.bind(prescriptionController));

export default router;