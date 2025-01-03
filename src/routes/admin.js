import express from 'express';
const router = express.Router();
import AdminController from '../controllers/adminController.js';
import ReceptionistController from '../controllers/receptionistController.js';
import DoctorController from '../controllers/doctorController.js';
import BillController from '../controllers/billController.js';
import PatientController from '../controllers/patientController.js';
import AppointmentController from '../controllers/appointmentController.js';
import upload from '../services/multer.services.js';
import AuthController from '../controllers/authController.js';

const adminController = new AdminController();
const receptionistController = new ReceptionistController();
const doctorController = new DoctorController();
const billController = new BillController();
const appointmentController = new AppointmentController();
const patientController = new PatientController();
const authController = new AuthController();


router.post("/editAdmin", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.EditProfile.bind(adminController));
router.delete("/delete/:id", adminController.deleteProfile.bind(adminController));
router.get("/getAdmin", adminController.getAdmin.bind(adminController));
router.post("/changePassword", authController.changePassword.bind(authController));


router.post("/createReceptionist", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.Register.bind(receptionistController));
router.delete("/deleteReceptionist/:id", receptionistController.deleteProfile.bind(receptionistController));
router.get("/getReceptionist", receptionistController.getreceptionist.bind(receptionistController));
router.post("/editReceptionist/:id", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.EditProfile.bind(receptionistController));      



router.post('/createDoctor', upload.fields([{ name: 'profilePicture', maxCount: 1 } , { name: 'signature', maxCount: 1 }]), adminController.createDoctor.bind(adminController));
router.delete('/deleteDoctor/:id', adminController.deleteDoctor.bind(adminController));
router.get('/getDoctor', doctorController.getdoctor.bind(doctorController));
router.post("/editDoctor/:id", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), doctorController.EditProfile.bind(doctorController)); 


router.get("/getSinglepatients", patientController.getPatients.bind(patientController));
router.get("/getpatients", patientController.getPatients.bind(patientController));


router.post("/createBill", billController.createBillManualy.bind(billController));
router.post("/editBill/:billId", billController.editBill.bind(billController));
router.get("/getBill", billController.getBill.bind(billController));
router.get("/getAppointment/withoutbill", appointmentController.getAppointmentsWithoutBills.bind(appointmentController));
router.get("/getbillbystatus", billController.getBillByStatus.bind(billController));


//today , privious , upcoming , all
router.get("/getAppointment", appointmentController.getAppointments.bind(appointmentController));
router.get("/getDashboardDatademo", adminController.getDashboardDatademo.bind(adminController));
router.get("/getpatientfromappointment/:id", appointmentController.getpatientfromappointment.bind(appointmentController));


router.get("/searchData", adminController.searchData.bind(adminController));
router.get("/getDashboardData", adminController.getDashboardData.bind(adminController));
router.get("/getPaginatedAppointments", adminController.getPaginatedAppointments.bind(adminController));
router.get("/getBillsMonitor", adminController.getBillsmonitoring.bind(adminController));
    
router.get("/reportandanalysis", adminController.reportandanalysis.bind(adminController));


export default router;