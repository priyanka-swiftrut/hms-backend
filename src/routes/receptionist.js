import express from "express";
import upload from "../services/multer.services.js";    
import ReceptionistController from "../controllers/receptionistController.js";
import AuthController from "../controllers/authController.js";
import PatientController from "../controllers/patientController.js";
import AppointmentController from "../controllers/appointmentController.js";
import PrescriptionController from "../controllers/PrescriptionController.js";
import AdminController from "../controllers/adminController.js";
const router = express.Router();
const receptionistController = new ReceptionistController();
const authController = new AuthController();
const patientController = new PatientController();
const appointmentController = new AppointmentController();
const prescriptionController = new PrescriptionController();
const adminController = new AdminController();
// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.EditProfile.bind(receptionistController));      
router.get("/getReceptionist", receptionistController.getreceptionist.bind(receptionistController));
router.post("/changePassword", authController.changePassword.bind(authController));

//add patient
router.post("/createPatient", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), patientController.Register.bind(patientController));
router.get("/getallpatient" , patientController.getPatients.bind(patientController));
router.get("/getPatientDeshboard", adminController.getDashboardDatademo.bind(adminController));

//all appointment
router.get("/getAppointment" , appointmentController.getAppointments.bind(appointmentController));
router.get("/getpatientfromappointment/:id", appointmentController.getpatientfromappointment.bind(appointmentController));
router.post("/createAppointment", appointmentController.createAppointment.bind(appointmentController));
router.post("/editAppointment/:id", appointmentController.editAppointment.bind(appointmentController));

router.post("/createPrescription/:appointmentId", prescriptionController.createPrescription.bind(prescriptionController));
router.get("/getappointmentforprescription" , prescriptionController.getAppointmentForPrescription.bind(prescriptionController)) 


router.get("/getBillsMonitor", adminController.getBillsmonitoring.bind(adminController));




export default router;