import express from "express";
import upload from "../services/multer.services.js";    
import DoctorController from "../controllers/doctorController.js";
const router = express.Router();
const doctorController = new DoctorController();
// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), doctorController.EditProfile.bind(doctorController));      




export default router;