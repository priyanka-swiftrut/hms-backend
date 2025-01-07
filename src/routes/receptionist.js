import express from "express";
import upload from "../services/multer.services.js";    
import ReceptionistController from "../controllers/receptionistController.js";
import AuthController from "../controllers/authController.js";
import PatientController from "../controllers/patientController.js";
import AppointmentController from "../controllers/appointmentController.js";
const router = express.Router();
const receptionistController = new ReceptionistController();
const authController = new AuthController();
const patientController = new PatientController();
const appointmentController = new AppointmentController();
// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.EditProfile.bind(receptionistController));      
router.get("/getReceptionist", receptionistController.getreceptionist.bind(receptionistController));
router.post("/changePassword", authController.changePassword.bind(authController));

//add patient
router.post("/createPatient", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), patientController.Register.bind(patientController));
router.get("/getallpatient" , patientController.getPatients.bind(patientController));

//all appointment
router.get("/getAppointment" , appointmentController.getAppointments.bind(appointmentController));
router.get("/getpatientfromappointment/:id", appointmentController.getpatientfromappointment.bind(appointmentController));
router.post("/createAppointment", appointmentController.createAppointment.bind(appointmentController));
router.post("/editAppointment/:id", appointmentController.editAppointment.bind(appointmentController));



export default router;