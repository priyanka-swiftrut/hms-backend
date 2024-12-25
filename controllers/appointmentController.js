import Appointment from '../models/Appointment.model.js';
import Bill from '../models/Bill.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.model.js';

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

            // Create bill for the appointment
            const bill = await this.createBill(newAppointment);
            if (!bill) {
                return ResponseService.sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error creating bill.", "error");
            }

            return ResponseService.send(res, StatusCodes.CREATED, "Appointment and bill created successfully", 1, { appointment: newAppointment, bill });
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
    }

    /**
     * Automatically creates a bill for the given appointment
     * @param {Object} appointment - The appointment document
     * @returns {Object} - The created bill document
     */
    async createBill(appointment) {
        try {
            const billData = {
                patientId: appointment.patientId,
                doctorId: appointment.doctorId,
                hospitalId: appointment.hospitalId,
                appointmentId: appointment._id,
                date: new Date(), // Current date
                time: new Date().toLocaleTimeString(), // Current time in string format
                status: "Unpaid",
            };

            const newBill = new Bill(billData);
            await newBill.save();
            return newBill;
        } catch (error) {
            console.error("Error creating bill:", error);
            return null;
        }
    }
}

export default AppointmentController;
