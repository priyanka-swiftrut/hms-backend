import express from "express";
import hospital from "./hospital.js";
import admin from "./admin.js";
import AdminController from "../controllers/adminController.js";
import upload from "../services/multer.services.js";
const router = express.Router();
const adminController = new AdminController();
// No Authorization Apis
router.post("/create", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.Register.bind(adminController));



router.use("/hospital", hospital); 
// Authorization Apis
router.use("/admin", admin);
export default router;
