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
            const hospitalId = req.user.hospitalId;

            if (!hospitalId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Hospital ID is required.", 0);
            }

            // Validate appointment ID
            if (!appointmentId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment ID is required.", 0);
            }
    
            // Validate medications
            if (!medications || medications.length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Medications are required.", 0);
            }
    
            // Fetch the appointment details
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment not found.", 0);
            }
    
            const { patientId, doctorId } = appointment;
    
            // Prepare prescription data
            const prescriptionData = {
                patientId,
                doctorId,
                hospitalId,
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
          // Ensure the user is authenticated
          if (!req.user.id) {
            return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
          }
      
          // Retrieve query parameters for filtering
          const { dateFilter, prescriptionId } = req.query; // 'today' or 'older', or prescriptionId
          const currentDate = new Date();
          const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0)); // Today's start time
          const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999)); // Today's end time
      
          let prescriptionQuery = {};
      
          // Apply user role-based filters
          if (req.user.role === "doctor") {
            prescriptionQuery.doctorId = req.user.id; // Doctor-specific prescriptions
          } else if (req.user.role === "patient") {
            prescriptionQuery.patientId = req.user.id; // Patient-specific prescriptions
          }
          console.log(req.user.id);
          
          // Include hospitalId filtering if available
          prescriptionQuery.hospitalId = req.user.hospitalId;
      
          // Apply date filters (if specified)
          if (dateFilter === 'today') {
            prescriptionQuery.date = { $gte: startOfDay, $lte: endOfDay }; // Filter for today's prescriptions
          } else if (dateFilter === 'older') {
            prescriptionQuery.date = { $lt: startOfDay }; // Filter for older prescriptions
          }
      
          // If prescriptionId is provided in the query, get that specific prescription
          if (prescriptionId) {
            prescriptionQuery._id = prescriptionId; // Filter by prescription ID
          }
      
          // If no query parameters (dateFilter, prescriptionId) are provided, fetch all prescriptions
          // for that user and hospital
          let prescriptions;
          if (dateFilter || prescriptionId) {
            // Fetch prescriptions with filters applied
            prescriptions = await Prescription.find(prescriptionQuery);
          } else {
            // Fetch all prescriptions for the user and hospital if no filters are provided
            prescriptions = await Prescription.find({ hospitalId: req.user.hospitalId, ...prescriptionQuery });
          }
      
          if (!prescriptions || prescriptions.length === 0) {
            return ResponseService.send(res, StatusCodes.NOT_FOUND, "No prescriptions found.", 0);
          }
      
          // Send response with the prescriptions data
          return ResponseService.send(res, StatusCodes.OK, "Prescriptions retrieved successfully", 1, { prescriptions });
        } catch (error) {
          return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
      }
    
   
    async editPrescription(req, res) {
        try {
            const { prescriptionId } = req.params;
            const { medications, instructions, date, status } = req.body;
    
            // Validate prescription ID
            if (!prescriptionId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Prescription ID is required.", 0);
            }
    
            // Fetch the prescription
            const prescription = await Prescription.findById(prescriptionId);
            if (!prescription) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Prescription not found.", 0);
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