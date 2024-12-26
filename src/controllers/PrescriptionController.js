import Appointment from '../models/Appointment.model.js';
import Prescription from '../models/priscription.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.model.js';

class PrescriptionController {
   
    async createPrescription(req, res) {
        try {
            const { appointmentId } = req.params;
            const { medications, instructions, date } = req.body;
    
            // Validate appointment ID
            if (!appointmentId) {
                return ResponseService.sendResponse(res, StatusCodes.BAD_REQUEST, "Appointment ID is required.", 0);
            }
    
            // Validate medications
            if (!medications || medications.length === 0) {
                return ResponseService.sendResponse(res, StatusCodes.BAD_REQUEST, "Medications are required.", 0);
            }
    
            // Fetch the appointment details
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return ResponseService.sendResponse(res, StatusCodes.NOT_FOUND, "Appointment not found.", 0);
            }
    
            const { patientId, doctorId } = appointment;
    
            // Prepare prescription data
            const prescriptionData = {
                patientId,
                doctorId,
                appointmentId,
                medications,
                instructions,
                date: date || new Date(), // Use provided date or default to current date
            };
            // Create and save the prescription
            const newPrescription = new Prescription(prescriptionData);
            await newPrescription.save();
    
            // Send success response
            return ResponseService.send(
                res,
                StatusCodes.CREATED,
                "Prescription created successfully.",
                1,
                { prescription: newPrescription }
            );
        } catch (error) {
            console.error("Error creating prescription:", error.message);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Server error. Please try again.", "error");
        }
    }

    async getPrescriptions(req, res) {
        try {
            
            if(!req.user.id) {
                return ResponseService.sendResponse(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
            }
            if(req.user.role === "doctor") {
                const prescription = await Prescription.find({ doctorId: req.user.id });
                return ResponseService.sendResponse(res, StatusCodes.OK, "prescription retrieved successfully", 1, { prescription });
            }
            if(req.user.role === "patient") {
                const prescription = await Prescription.find({ patientId: req.user.id });
                return ResponseService.sendResponse(res, StatusCodes.OK, "prescription retrieved successfully", 1, { prescription });
            }
            const prescription = await Prescription.find();
            return ResponseService.sendResponse(res, StatusCodes.OK, "prescription retrieved successfully", 1, { prescription });
        } catch (error) {
            return ResponseService.sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
    }

   
    async editPrescription(req, res) {
        try {
            const { prescriptionId } = req.params;
            const { medications, instructions, date, status } = req.body;
    
            // Validate prescription ID
            if (!prescriptionId) {
                return ResponseService.sendResponse(res, StatusCodes.BAD_REQUEST, "Prescription ID is required.", 0);
            }
    
            // Fetch the prescription
            const prescription = await Prescription.findById(prescriptionId);
            if (!prescription) {
                return ResponseService.sendResponse(res, StatusCodes.NOT_FOUND, "Prescription not found.", 0);
            }
    
            // Update fields if provided in the request body
            if (medications) prescription.medications = medications;
            if (instructions) prescription.instructions = instructions;
            if (date) prescription.date = date;
            if (status) prescription.status = status;
    
            // Save updated prescription
            await prescription.save();
    
            // Send success response
            return ResponseService.send(
                res,
                StatusCodes.OK,
                "Prescription updated successfully.",
                1,
                { prescription }
            );
        } catch (error) {
            console.error("Error updating prescription:", error.message);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Server error. Please try again.", "error");
        }
    }


}

export default PrescriptionController;