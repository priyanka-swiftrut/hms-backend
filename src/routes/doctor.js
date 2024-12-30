import express from "express";
import upload from "../services/multer.services.js";    
import DoctorController from "../controllers/doctorController.js";
import AppointmentController from "../controllers/appointmentController.js";
import PrescriptionController from "../controllers/PrescriptionController.js";
import PatientController from "../controllers/patientController.js";
const router = express.Router();
const doctorController = new DoctorController();
const appointmentController = new AppointmentController();
const prescriptionController = new PrescriptionController();
const patientController = new PatientController();
// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), doctorController.EditProfile.bind(doctorController)); 
router.get("/getDoctor", doctorController.getdoctor.bind(doctorController));

router.post("/editAppointment", appointmentController.editAppointment.bind(appointmentController));

router.get("/getAppointment", appointmentController.getAppointments.bind(appointmentController));

    

router.post("/createPrescription/appointmentId", prescriptionController.createPrescription.bind(prescriptionController));
router.get("/getPrescription", prescriptionController.getPrescriptions.bind(prescriptionController));
router.post("/editPrescription/prescriptionId", prescriptionController.editPrescription.bind(prescriptionController));


router.get("/getPatientRecord", doctorController.getPatientRecord.bind(doctorController));
router.get("getSinglepatients", patientController.getPatients.bind(patientController));

export default router;