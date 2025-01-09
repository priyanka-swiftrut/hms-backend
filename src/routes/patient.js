import express from "express";
import PatientController from "../controllers/patientController.js";
import AppointmentController from "../controllers/appointmentController.js";
import PrescriptionController from "../controllers/PrescriptionController.js";
import DoctorController from "../controllers/doctorController.js";
import AdminController from "../controllers/adminController.js";
import BillController from "../controllers/billController.js";
import AuthController from "../controllers/authController.js";
import upload from "../services/multer.services.js";   
const router = express.Router();
const patientController = new PatientController();
const appointmentController = new AppointmentController();
const prescriptionController = new PrescriptionController();
const adminController = new AdminController();
const authController = new AuthController();
const doctorController = new DoctorController();
const billController = new BillController();

// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), patientController.EditProfile.bind(patientController));      
// router.delete("/delete/:id", patientController.deleteProfile.bind(patientController));
router.get("/getpatients", patientController.getPatients.bind(patientController));
router.get("/getSinglepatients", patientController.getPatients.bind(patientController));
router.post("/changePassword", authController.changePassword.bind(authController));


router.post("/createAppointment", appointmentController.createAppointment.bind(appointmentController));
router.post("/editAppointment", appointmentController.editAppointment.bind(appointmentController));

router.get("/getAppointment", appointmentController.getAppointments.bind(appointmentController));
router.get("/getAppointmentsTeleconcsultation", appointmentController.getAppointmentsTeleconsultation.bind(appointmentController));
router.get("/searchAppointment", appointmentController.getseacrchingforappointment.bind(appointmentController));
router.get("/searchAppointmentdata", appointmentController.getseacrchingforappointment.bind(appointmentController));
router.get("/getpatientfromappointment/:id", appointmentController.getpatientfromappointment.bind(appointmentController));



router.get("/getDoctorSession/:doctorId", appointmentController.getDoctorSession.bind(appointmentController));



router.get("/getPrescription", prescriptionController.getPrescriptions.bind(prescriptionController));

router.get("/getBillsforPatient", patientController.getBillsforPatient.bind(patientController));
router.get("getsinglebill" , billController.getBill.bind(billController));
router.get("/getDashboardData", adminController.getDashboardDatademo.bind(adminController));

router.get("/getDoctor", doctorController.getdoctor.bind(doctorController));
router.get("/getDoctorandhospital", patientController.getDoctorAndHospital.bind(patientController));

router.get("/chatcontect" ,appointmentController.chatcontect.bind(appointmentController))

export default router;
