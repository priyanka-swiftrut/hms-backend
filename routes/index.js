import express from "express";
import hospital from "./hospital.js";
import admin from "./admin.js";
import patient from "./patient.js";
import AdminController from "../controllers/adminController.js";
import PatientController from "../controllers/patientController.js";
import upload from "../services/multer.services.js";
const router = express.Router();
const adminController = new AdminController();
const patientController = new PatientController();
// No Authorization Apis
router.post("/create", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.Register.bind(adminController));
router.post("/patientcreate", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), patientController.Register.bind(patientController));



router.use("/hospital", hospital); 
// Authorization Apis
router.use("/admin", admin);
router.use("/patient", patient);

export default router;
