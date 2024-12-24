
import Appointment from '../models/Appointment.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import cloudinary from '../config/cloudinaryConfig.js';
import crypto from 'crypto';
import EmailService from '../services/email.service.js';


class AppointmentController { 

   async createAppointment(req, res) {


    try {
        const { doctorId, date, appointmentTime, type, patient_issue, dieseas_name, city, state, country } = req.body;

        // Validate user role (only patients can create appointments)
        if (!req.user || req.user.role !== "patient") {
            return sendResponse(res, StatusCodes.FORBIDDEN, "Access denied. Only patients can create appointments.", 0);
        }

        // Ensure the doctor exists and is associated with the same hospital
        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return sendResponse(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
        }

        // Create the appointment object
        const appointmentData = {
            patientId: req.user.id,
            doctorId,
            hospitalId: doctor.hospitalId,
            date,
            appointmentTime,
            type,
            patient_issue,
            dieseas_name,
            city,
            state,
            country,
            status: "scheduled", // Default status
        };

        // Save the appointment
        const newAppointment = new Appointment(appointmentData);
        await newAppointment.save();

        return sendResponse(res, StatusCodes.CREATED, "Appointment created successfully", 1, newAppointment);
    } catch (error) {
        return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
    }


   }
            

}


export default AppointmentController;