import Appointment from '../models/Appointment.model.js';
import Prescription from '../models/priscription.model.js';
import ResponseService from '../services/response.services.js';
import mongoose from "mongoose";
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
      if (!req.user?.id) {
        return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
      }
  
      const { dateFilter, prescriptionId } = req.query;
      let prescriptionQuery = {};
      const currentDate = new Date();
      const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
  
      if (req.user.role !== "patient") {
        prescriptionQuery = { hospitalId: req.user.hospitalId };
      }
  
      if (req.user.role === "doctor") {
        prescriptionQuery.doctorId = req.user.id;
      } else if (req.user.role === "patient") {
        prescriptionQuery.patientId = req.user.id;
      }
      
      if (dateFilter === "today") {
        prescriptionQuery.date = { $gte: startOfDay, $lte: endOfDay };
      } else if (dateFilter === "older") {
        prescriptionQuery.date = { $lt: startOfDay };
      }
  
      if (prescriptionId) {
        if (mongoose.isValidObjectId(prescriptionId)) {
          prescriptionQuery._id = prescriptionId;
        } else {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid prescription ID format", "error");
        }
      }
  
      let prescriptions = await Prescription.find(prescriptionQuery)
        .populate("patientId", "fullName gender address age")
        .populate("doctorId", "fullName metaData.doctorData.speciality metaData.doctorData.signature")
        .populate("appointmentId", "dieseas_name type")
        .populate("hospitalId", "name");
  
      prescriptions = prescriptions.map((prescription) => {
        const addressObj = prescription.patientId?.address;
        const formattedAddress = addressObj
          ? `${addressObj.fullAddress || "N/A"}, ${addressObj.city || "N/A"}, ${addressObj.state || "N/A"}, ${addressObj.country || "N/A"}, ${addressObj.zipCode || "N/A"}`
          : "N/A";
  
        return {
          prescriptionId: prescription._id,
          prescriptionDate: prescription.date,
          hospitalName: prescription.hospitalId?.name || "N/A",
          DiseaseName: prescription.appointmentId?.dieseas_name || "N/A",
          DoctorName: prescription.doctorId?.fullName || "N/A",
          patientName: prescription.patientId?.fullName || "N/A",
          doctorspecialty: prescription.doctorId?.metaData?.doctorData?.speciality || "N/A",
          gender: prescription.patientId?.gender || "N/A",
          age: prescription.patientId?.age || "N/A",
          address: formattedAddress, // Replaced the raw address object with the formatted string
          medications: prescription.medications || "N/A",
          additionalNote: prescription.instructions || "N/A",
          doctorsignature: prescription.doctorId?.metaData?.doctorData?.signature || "N/A",
        };
      });
  
      if (!prescriptions.length) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "No prescriptions found.", 0);
      }
  
      return ResponseService.send(res, StatusCodes.OK, "Prescriptions retrieved successfully", 1, prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred.", "error");
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

  async getpatientdetails(req, res) {
    try {
      const { prescriptionId } = req.params; // Prescription ID from route params
      const { dateFilter, prescriptionId: queryPrescriptionId } = req.query; // Query params for filtering
      const currentDate = new Date();
      const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of today
      const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999)); // End of today

      // Initialize query object
      let prescriptionQuery = {};

      // Apply role-based filters
      if (req.user.role === "doctor") {
        prescriptionQuery.doctorId = req.user.id;
      } else if (req.user.role === "patient") {
        prescriptionQuery.patientId = req.user.id;
      }

      // Apply date-based filters
      if (dateFilter === "today") {
        prescriptionQuery.date = { $gte: startOfDay, $lte: endOfDay };
      } else if (dateFilter === "older") {
        prescriptionQuery.date = { $lt: startOfDay };
      }

      // Filter by prescription ID if provided in the query
      if (queryPrescriptionId) {
        prescriptionQuery._id = queryPrescriptionId;
      }

      // Default behavior: Fetch all prescriptions for the user's hospital if no specific filters are provided
      if (!dateFilter && !queryPrescriptionId) {
        prescriptionQuery.hospitalId = req.user.hospitalId;
      }

      // Fetch prescriptions from the database
      const prescriptions = await Prescription.find(prescriptionQuery)
      .populate("patientId", "fullName phone age gender")
      .populate("appointmentId", "dieseas_name type ")


      // Check if prescriptions exist
      if (!prescriptions || prescriptions.length === 0) {
        return ResponseService.send(res,StatusCodes.NOT_FOUND,"No prescriptions found.",0);
      }

      // Respond with the prescriptions
      return ResponseService.send(res,StatusCodes.OK,"Prescriptions retrieved successfully",1,{ prescriptions });
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      return ResponseService.send(res,StatusCodes.INTERNAL_SERVER_ERROR,error.message,0);
    }
  }


}

export default PrescriptionController;