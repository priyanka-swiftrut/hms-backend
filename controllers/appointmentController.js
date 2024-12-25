import Appointment from '../models/Appointment.model.js';
import ResponseService from '../services/response.services.js'; // or use sendResponse
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.model.js'; // Assuming you're using this model

class AppointmentController {
    async createAppointment(req, res) {
        try {
            const { doctorId, date, appointmentTime, type, patient_issue, dieseas_name, city, state, country } = req.body;

            // Ensure the doctor exists
            const doctor = await User.findById(doctorId);
            if (!doctor) {
                return ResponseService.sendResponse(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
            }

            // Create appointment data
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
                status: "scheduled",
            };

            const newAppointment = new Appointment(appointmentData);
            await newAppointment.save();

            return ResponseService.send(res, StatusCodes.CREATED, "Appointment created successfully", 1, newAppointment);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
    }
}

export default AppointmentController;
