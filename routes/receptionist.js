import express from "express";
import upload from "../services/multer.services.js";    
import ReceptionistController from "../controllers/receptionistController.js";
const router = express.Router();
const receptionistController = new ReceptionistController();
// No Authorization Apis

// Authorization Apis
router.post("/edit", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), receptionistController.EditProfile.bind(receptionistController));      
router.get("/getReceptionist", receptionistController.getreceptionist.bind(receptionistController));



export default router;