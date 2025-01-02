import express from "express";
import upload from "../services/multer.services.js";    
import ReceptionistController from "../controllers/receptionistController.js";
import AuthController from "../controllers/authController.js";
const router = express.Router();
const receptionistController = new ReceptionistController();
const authController = new AuthController();
// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.EditProfile.bind(receptionistController));      
router.get("/getReceptionist", receptionistController.getreceptionist.bind(receptionistController));
router.post("/changePassword", authController.changePassword.bind(authController));



export default router;