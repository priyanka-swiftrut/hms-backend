import express from "express";
import hospital from "./hospital.js";
import admin from "./admin.js";
import patient from "./patient.js";
import doctor from "./doctor.js";
import receptionist from "./receptionist.js";
import AdminController from "../controllers/adminController.js";
import PatientController from "../controllers/patientController.js";
import AppointmentController from "../controllers/appointmentController.js";
import upload from "../services/multer.services.js";
import  passport  from "passport";
import adminRoutes from './admin.js';
import auth from './auth.js';
import ResponseService from "../services/response.services.js";
const router = express.Router();
const adminController = new AdminController();
const patientController = new PatientController();
// No Authorization Apis
router.post("/registerAdmin", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), adminController.Register.bind(adminController));
router.post("/registerPatient", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), patientController.Register.bind(patientController));
router.use("/auth", auth);

router.use("/hospital", hospital); 
// Authorization Apis

router.use('/admin', (req, res, next) => {
    passport.authenticate('jwt', (err, user) => {
        if (err || !user) { return ResponseService.send(res, 403, 'Unauthorized', 0); }
        req.user = user; next();
    })(req, res, next);
}, adminRoutes);
router.use('/patient', (req, res, next) => {
    passport.authenticate('Patient', (err, user) => {
        if (err || !user) { return ResponseService.send(res, 403, 'Unauthorized', 0); }
        req.user = user; next();
    })(req, res, next);
}, patient);
router.use('/receptionist', (req, res, next) => {
    passport.authenticate('Receptionist', (err, user) => {
        if (err || !user) { return ResponseService.send(res, 403, 'Unauthorized', 0); }
        req.user = user; next();
    })(req, res, next);
}, receptionist);

router.use('/doctor', (req, res, next) => {
    passport.authenticate('Doctor', (err, user) => {
        if (err || !user) { return ResponseService.send(res, 403, 'Unauthorized', 0); }
        req.user = user; next();
    })(req, res, next);
}, doctor);



export default router;
