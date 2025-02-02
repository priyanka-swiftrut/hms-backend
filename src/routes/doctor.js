import express from "express";
import upload from "../services/multer.services.js";    
import DoctorController from "../controllers/doctorController.js";
import AppointmentController from "../controllers/appointmentController.js";
import PrescriptionController from "../controllers/PrescriptionController.js";
import PatientController from "../controllers/patientController.js";
import AuthController from "../controllers/authController.js";
import HolidayController from "../controllers/holidayController.js";
import AppointmentRecoedsController from "../controllers/appointmentRecoedsController.js";
const router = express.Router();
const doctorController = new DoctorController();
const appointmentController = new AppointmentController();
const prescriptionController = new PrescriptionController();
const patientController = new PatientController();
const authController = new AuthController();
const holidayController = new HolidayController();
const appointmentRecoedsController = new AppointmentRecoedsController();
// No Authorization Apis

// Authorization Apis
router.post("/editUser", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), doctorController.EditProfile.bind(doctorController)); 
router.put("/editUser", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), doctorController.EditProfile.bind(doctorController)); 
router.get("/getDoctor", doctorController.getdoctor.bind(doctorController));
router.post("/changePassword", authController.changePassword.bind(authController));
router.patch("/changePassword", authController.changePassword.bind(authController));



router.post("/editAppointment/:id", appointmentController.editAppointment.bind(appointmentController));
router.put("/editAppointment/:id", appointmentController.editAppointment.bind(appointmentController));

router.get("/getAppointment", appointmentController.getAppointments.bind(appointmentController));
router.get("/getpatientfromappointment/:id", appointmentController.getpatientfromappointment.bind(appointmentController));
router.get("/getpatient", patientController.getPatients.bind(patientController));
router.get("/getAppointmentsTeleconcsultation", appointmentController.getAppointmentsTeleconsultation.bind(appointmentController));



router.post("/createPrescription/:appointmentId", prescriptionController.createPrescription.bind(prescriptionController));
router.get("/getPrescription", prescriptionController.getPrescriptions.bind(prescriptionController));
router.post("/editPrescription/:prescriptionId", prescriptionController.editPrescription.bind(prescriptionController));
router.put("/editPrescription/:prescriptionId", prescriptionController.editPrescription.bind(prescriptionController));
router.get("/getpatientdetails", prescriptionController.getpatientdetails.bind(prescriptionController));
router.get("/getappointmentforprescription" , prescriptionController.getAppointmentForPrescription.bind(prescriptionController)) 
router.get("/chatcontect" ,appointmentController.chatContext.bind(appointmentController))



router.get("/getPatientRecord", doctorController.getPatientRecord.bind(doctorController));
router.get("/getSinglepatients", patientController.getPatients.bind(patientController));
router.get("/getpatient", patientController.getPatients.bind(patientController));
router.get("/getsinglepatientrecord/:patientId", doctorController.getsinglepatientrecord.bind(doctorController));



//holiday
router.post("/createHoliday", holidayController.createHoliday.bind(holidayController));
router.get("/getholidays", holidayController.getHolidays.bind(holidayController));
router.put("/updateholiday/:holidayId", holidayController.updateHoliday.bind(holidayController));
router.delete("/deleteholiday", holidayController.deleteHoliday.bind(holidayController));


//appointmentRecord

router.post('/appointments/:appointmentId/records',upload.array('appointmentRecord', 10), appointmentRecoedsController.createAppointmentRecord.bind(appointmentRecoedsController) );
router.get('/appointments/:appointmentId/records', appointmentRecoedsController.getAppointmentRecord.bind(appointmentRecoedsController));
router.put('/appointments/:appointmentId/records/:recordId', upload.fields([{ name: 'appointmentRecord', maxCount: 1 }]), appointmentRecoedsController.editAppointmentRecord.bind(appointmentRecoedsController));
router.delete('/appointments/:appointmentId/records/:recordId/images/:imageUrl', appointmentRecoedsController.deleteImages.bind(appointmentRecoedsController));


router.get("/getDoctorSession", appointmentController.getDoctorSession.bind(appointmentController));


export default router;