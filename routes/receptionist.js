import express from "express";
import ReceptionistController from "../controllers/receptionistController.js";
const router = express.Router();
const receptionistController = new ReceptionistController();

// Authorization Apis
router.post("/edit", receptionistController.EditProfile.bind(receptionistController));
router.delete("/delete/:id", receptionistController.deleteProfile.bind(receptionistController));

export default router;