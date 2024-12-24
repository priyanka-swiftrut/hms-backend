import express from 'express';
const router = express.Router();
import AdminController from '../controllers/adminController.js';
import ReceptionistController from '../controllers/receptionistController.js';
import upload from '../services/multer.services.js';
const adminController = new AdminController();
const receptionistController = new ReceptionistController();


router.post("/editAdmin", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.EditProfile.bind(adminController));
router.delete("/delete/:id", adminController.deleteProfile.bind(adminController));


router.post("/createReceptionist", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.Register.bind(receptionistController));
router.delete("/deleteReceptionist/:id", receptionistController.deleteProfile.bind(receptionistController));


router.post('/createDoctor', upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.createDoctor.bind(adminController));
router.delete('/deleteDoctor/:id', adminController.deleteDoctor.bind(adminController));
export default router;