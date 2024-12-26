import express from "express";
import AppointmentController from "../controllers/appointmentController.js";
const router = express.Router();
const appointmentController = new AppointmentController();

// No Authorization Apis

// Authorization Apis
router.post("/scheduleAppointment", appointmentController.ScheduleAppointment.bind(appointmentController));
router.post("/cancelAppointment", appointmentController.CancelAppointment.bind(appointmentController));
router.post("/completeAppointment", appointmentController.CompleteAppointment.bind(appointmentController));      

export default router;      