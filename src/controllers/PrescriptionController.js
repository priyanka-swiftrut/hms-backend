import Appointment from '../models/Appointment.model.js';
import Prescription from '../models/priscription.model.js';
import ResponseService from '../services/response.services.js';
import mongoose from "mongoose";
import { StatusCodes } from 'http-status-codes';
import sendNotification from '../services/notificationService.js';


class PrescriptionController {

  async createPrescription(req, res) {
    try {
      const { appointmentId } = req.params;
      const { medications, instructions, date } = req.body;
      const { hospitalId } = req.user;

      if (!hospitalId) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Hospital ID is required.", 0);
      }

      if (!appointmentId) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment ID is required.", 0);
      }

      // Check if a prescription already exists for the appointment
      const existingPrescription = await Prescription.findOne({ appointmentId });
      if (existingPrescription) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "A prescription already exists for this appointment.", 0);
      }

      if (!medications || medications.length === 0) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Medications are required.", 0);
      }

      const appointment = await Appointment.findById(appointmentId)
          .populate("patientId", "fullName")
          .populate("doctorId", "fullName");

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
          date: date || new Date(),
      };

      const newPrescription = new Prescription(prescriptionData);
      await newPrescription.save();

      await sendNotification({
          type: "Prescription",
          message: `A new prescription has been created for you by Dr. ${appointment.doctorId.fullName}. Date: ${prescriptionData.date.toDateString()}, Medications: ${medications.join(", ")}.`,
          hospitalId,
          targetUsers: patientId,
      });

      return ResponseService.send(
          res,
          StatusCodes.CREATED,
          "Prescription created successfully.",
          1,
          { prescription: newPrescription }
      );
  } catch (error) {
      console.error("Error creating prescription:", error.message);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Server error. Please try again.", 0);
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
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Server error. Please try again.", 0);
  }
  }

  async getPrescriptions(req, res) {
    try {
      const { id: userId, role, hospitalId } = req.user ?? {};
      if (!userId) {
          return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
      }

      const { dateFilter, prescriptionId, specificDate, startDate, endDate } = req.query;
      let prescriptionQuery = {};
      const currentDate = new Date();
      const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

      if (role !== "patient") {
          prescriptionQuery = { hospitalId };
      }

      switch (role) {
          case "doctor":
              prescriptionQuery.doctorId = userId;
              break;
          case "patient":
              prescriptionQuery.patientId = userId;
              break;
          case "receptionist":
              prescriptionQuery.hospitalId = hospitalId;
              break;
      }

      // Apply date filters
      if (dateFilter === "today") {
          prescriptionQuery.date = { $gte: startOfDay, $lte: endOfDay };
      } else if (dateFilter === "older") {
          prescriptionQuery.date = { $lt: startOfDay };
      } else if (specificDate) {
          const specificDateObj = new Date(specificDate);
          if (isNaN(specificDateObj.getTime())) {
              return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid date format", 0);
          }
          const specificStartOfDay = new Date(specificDateObj.setHours(0, 0, 0, 0));
          const specificEndOfDay = new Date(specificDateObj.setHours(23, 59, 59, 999));
          prescriptionQuery.date = { $gte: specificStartOfDay, $lte: specificEndOfDay };
      } else if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Include the end date's entire day
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
              return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid start or end date format", 0);
          }
          prescriptionQuery.date = { $gte: start, $lte: end };
      }

      if (prescriptionId && mongoose.isValidObjectId(prescriptionId)) {
          prescriptionQuery._id = prescriptionId;
      } else if (prescriptionId) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid prescription ID format", 0);
      }

      let prescriptions = await Prescription.find(prescriptionQuery)
          .populate("patientId", "fullName gender address age phone")
          .populate("doctorId", "fullName metaData.doctorData.speciality metaData.doctorData.signature")
          .populate("appointmentId", "dieseas_name type appointmentTime date")
          .populate("hospitalId", "name");

      prescriptions = prescriptions.map((prescription) => {
          const { patientId, doctorId, appointmentId, hospitalId, medications, instructions, date } = prescription;
          const addressObj = patientId?.address;
          const formattedAddress = addressObj
              ? `${addressObj.fullAddress || "N/A"}, ${addressObj.city || "N/A"}, ${addressObj.state || "N/A"}, ${addressObj.country || "N/A"}, ${addressObj.zipCode || "N/A"}`
              : "N/A";

          return {
              prescriptionId: prescription._id,
              prescriptionDate: new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
              hospitalName: hospitalId?.name || "N/A",
              DiseaseName: appointmentId?.dieseas_name || "N/A",
              DoctorName: doctorId?.fullName || "N/A",
              patientName: patientId?.fullName || "N/A",
              patientNumber: patientId?.phone || "N/A",
              doctorspecialty: doctorId?.metaData?.doctorData?.speciality || "N/A",
              gender: patientId?.gender || "N/A",
              age: patientId?.age || "N/A",
              address: formattedAddress,
              medications: medications || "N/A",
              additionalNote: instructions || "N/A",
              doctorsignature: doctorId?.metaData?.doctorData?.signature || "N/A",
              appointmentTime: appointmentId?.appointmentTime || "N/A",
              appointmentDate: appointmentId?.date || "N/A",
              dieseas_name: appointmentId?.dieseas_name || "N/A",
          };
      });

      if (dateFilter === "today" && !prescriptions.length) {
          return ResponseService.send(res, StatusCodes.OK, "No prescriptions found.", 0, []);
      }

      if (!prescriptions.length) {
          return ResponseService.send(res, StatusCodes.NOT_FOUND, "No prescriptions found.", 0);
      }

      return ResponseService.send(res, StatusCodes.OK, "Prescriptions retrieved successfully", 1, prescriptions);
  } catch (error) {
      console.error("Error fetching prescriptions:", error);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred.", 0);
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
        .populate("appointmentId", "dieseas_name type");
  
      // Check if prescriptions exist
      if (!prescriptions?.length) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "No prescriptions found.", 0);
      }
  
      // Respond with the prescriptions
      return ResponseService.send(res, StatusCodes.OK, "Prescriptions retrieved successfully", 1, prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
  }

  async getAppointmentForPrescription(req, res) {
    try {
      const { hospitalId, role, _id: userId } = req.user;
  
      if (!hospitalId) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "Hospital ID is required.", 0);
      }
  
      const { date } = req.query; // `date` is optional
  
      // Initialize date range filter
      let dateFilter = {};
  
      if (date === "today") {
        // Filter for today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of the day
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1); // Start of next day
        dateFilter = { date: { $gte: today, $lt: tomorrow } };
      } else if (date) {
        // Filter for a specific date
        const specificDate = new Date(date);
        if (isNaN(specificDate)) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid date format. Use YYYY-MM-DD.", 0);
        }
        specificDate.setHours(0, 0, 0, 0); // Start of the specific date
        const nextDay = new Date(specificDate);
        nextDay.setDate(specificDate.getDate() + 1); // Start of the next day
        dateFilter = { date: { $gte: specificDate, $lt: nextDay } };
      }
  
      // Step 1: Get all prescription appointment IDs
      const prescriptions = await Prescription.find({ hospitalId }).select("appointmentId");
      const prescriptionAppointmentIds = prescriptions.map((p) => p.appointmentId.toString());
  
      // Step 2: Build the query for appointments
      const appointmentQuery = {
        hospitalId,
        _id: { $nin: prescriptionAppointmentIds },
        status: { $ne: "canceled" },
        ...dateFilter, // Apply the date filter if provided
      };
  
      // If the user is a doctor, filter by doctorId
      if (role === "doctor") {
        appointmentQuery.doctorId = userId;
      }
  
      const appointmentsWithoutPrescriptions = await Appointment.find(appointmentQuery)
        .populate("patientId doctorId", "fullName email gender age");
  
      return ResponseService.send(res, StatusCodes.OK, "Data fetched successfully", 1, appointmentsWithoutPrescriptions);
    } catch (error) {
      console.error("Error fetching appointments without prescriptions:", error);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch appointments. Please try again later.", error.message, 0);
    }
  }

}

export default PrescriptionController;