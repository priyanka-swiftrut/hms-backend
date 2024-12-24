import express from 'express';
const router = express.Router();
import AdminController from '../controllers/adminController.js';
import upload from '../services/multer.services.js';
const adminController = new AdminController();

router.post("/editAdmin", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.EditProfile.bind(adminController));
router.delete("/delete/:id", adminController.deleteProfile.bind(adminController));
router.post('/registerDoctor', upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.RegisterDoctor.bind(adminController));

export default router;