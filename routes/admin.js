import express from 'express';
const router = express.Router();
import AdminController from '../controllers/adminController.js';
import ReceptionistController from '../controllers/receptionistController.js';
import DoctorController from '../controllers/doctorController.js';
import BillController from '../controllers/billController.js';
import AppointmentController from '../controllers/appointmentController.js';
import upload from '../services/multer.services.js';
const adminController = new AdminController();
const receptionistController = new ReceptionistController();
const doctorController = new DoctorController();
const billController = new BillController();
const appointmentController = new AppointmentController();


router.post("/editAdmin", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.EditProfile.bind(adminController));
router.delete("/delete/:id", adminController.deleteProfile.bind(adminController));


router.post("/createReceptionist", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.Register.bind(receptionistController));
router.delete("/deleteReceptionist/:id", receptionistController.deleteProfile.bind(receptionistController));
router.get("/getReceptionist", receptionistController.getreceptionist.bind(receptionistController));


router.post('/createDoctor', upload.fields([{ name: 'profilePicture', maxCount: 1 } , { name: 'signature', maxCount: 1 }]), adminController.createDoctor.bind(adminController));
router.delete('/deleteDoctor/:id', adminController.deleteDoctor.bind(adminController));
router.get('/getDoctor', doctorController.getdoctor.bind(doctorController));

    

router.post("/createBill", billController.editBill.bind(billController));
router.post("/editBill/:billId", billController.editBill.bind(billController));
router.get("/getBill", billController.getBill.bind(billController));



router.get("/getAppointment", appointmentController.getAppointments.bind(appointmentController));


export default router;