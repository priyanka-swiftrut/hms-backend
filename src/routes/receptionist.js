import express from "express";
import upload from "../services/multer.services.js";    
import ReceptionistController from "../controllers/receptionistController.js";
import AuthController from "../controllers/authController.js";
import PatientController from "../controllers/patientController.js";
import AppointmentController from "../controllers/appointmentController.js";
import PrescriptionController from "../controllers/PrescriptionController.js";
import AdminController from "../controllers/adminController.js";
import DoctorController from "../controllers/doctorController.js";
import BillController from "../controllers/billController.js";
const router = express.Router();
const receptionistController = new ReceptionistController();
const authController = new AuthController();
const patientController = new PatientController();
const appointmentController = new AppointmentController();
const prescriptionController = new PrescriptionController();
const adminController = new AdminController();
const billController = new BillController();
const doctorController = new DoctorController();
// No Authorization Apis

// Authorization Apis
router.post("/editUser", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.EditProfile.bind(receptionistController));      
router.put("/editUser", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.EditProfile.bind(receptionistController));      
router.get("/getReceptionist", receptionistController.getreceptionist.bind(receptionistController));
router.patch("/changePassword", authController.changePassword.bind(authController));

//add patient
router.post("/createPatient", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), patientController.Register.bind(patientController));
router.get("/getallpatient" , patientController.getPatients.bind(patientController));
router.get("/getDashboardData", adminController.getDashboardDatademo.bind(adminController));
router.get("/getPatient", receptionistController.getPatient.bind(receptionistController));
router.get("/patientdetails", receptionistController.getpatientdetailforreception.bind(receptionistController));
router.get("/getPatientRecord", doctorController.getPatientRecord.bind(doctorController));
router.get("/getpatientdeshboard", receptionistController.patientdeshboardforreceptionist.bind(receptionistController));



//all appointment
router.get("/getAppointment" , appointmentController.getAppointments.bind(appointmentController));
router.get("/getpatientfromappointment/:id", appointmentController.getpatientfromappointment.bind(appointmentController));
router.post("/createAppointment", appointmentController.createAppointment.bind(appointmentController));
router.post("/editAppointment/:id", appointmentController.editAppointment.bind(appointmentController));
router.put("/editAppointment/:id", appointmentController.editAppointment.bind(appointmentController));
router.get("/searchAppointment", receptionistController.searchDoctor.bind(receptionistController));

router.post("/createPrescription/:appointmentId", prescriptionController.createPrescription.bind(prescriptionController));
router.get("/getappointmentforprescription" , prescriptionController.getAppointmentForPrescription.bind(prescriptionController)) 
// router.get("/searchAppointment", appointmentController.getseacrchingforappointment.bind(appointmentController));
router.get("/getDoctorSession/:doctorId", appointmentController.getDoctorSession.bind(appointmentController));


router.get("/getBillsMonitor", adminController.getBillsmonitoring.bind(adminController));
router.post("/createBill", billController.createBillManualy.bind(billController));
router.post("/editBill/:billId", billController.editBill.bind(billController));
router.put("/editBill/:billId", billController.editBill.bind(billController));
router.get("/monitor-billing/bill-view", billController.getBill.bind(billController));
router.get("/getAppointment/withoutbill", appointmentController.getAppointmentsWithoutBills.bind(appointmentController));
router.get("/getbillbystatus", billController.getBillByStatus.bind(billController));
router.get("/getBill", billController.getBill.bind(billController));


export default router;