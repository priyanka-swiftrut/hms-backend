import Bill from '../models/Bill.model.js';
import Insurance from "../models/Insurance.model.js";
import AppointmentModel from "../models/Appointment.model.js";
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';

class BillController {


  async createBillManualy(req, res) {
    try {
      const {
        appointmentId,
        amount,
        discount,
        tax,
        paymentType,
        description,
        insuranceDetails,
        notes,
      } = req.body;
  
      // Ensure required fields are provided
      if (!appointmentId || !amount) {
        return ResponseService.send(
          res,
          StatusCodes.BAD_REQUEST,
          "Missing required fields: appointmentId or amount.",
          0
        );
      }
  
      // Fetch appointment details from the AppointmentModel using appointmentId
      const appointment = await AppointmentModel.findById(appointmentId).populate('patientId doctorId');
      
      if(req.user.role !== "receptionist"  && paymentType === "cash" && appointmentType === "online"){
        response.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
      }



      if (!appointment) {
        return ResponseService.send(res,StatusCodes.NOT_FOUND,"Appointment not found.",0);
      }

      const { patientId, doctorId, hospitalId } = appointment;
  
      // Validate the discount and tax values
      if (discount && (discount < 0 || discount > 100)) {
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Discount must be between 0 and 100.", 0);
      }
  
      if (tax && tax < 0) {
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Tax cannot be negative.", 0);
      }
  
      // Validate and calculate extra charges from description
      let extraCharges = 0;
      if (description && Array.isArray(description)) {
        description.forEach((item) => {
          if (typeof item.value === "number") {
            extraCharges += item.value;
          } else {
            return ResponseService.send(res,StatusCodes.BAD_REQUEST,"Each description entry must have a numeric value.",0);
          }
        });
      }
  
      // Validate insurance details if payment type is "Insurance"
      let insuranceId = null;
      if (paymentType === "Insurance") {
        const { insuranceCompany, insurancePlan, claimAmount, claimedAmount } =
          insuranceDetails || {};
  
        if (
          !insuranceCompany ||
          !insurancePlan ||
          claimAmount === undefined ||
          claimedAmount === undefined
        ) {
          return ResponseService.send(res,StatusCodes.BAD_REQUEST,"Incomplete insurance details. Provide insuranceCompany, insurancePlan, claimAmount, and claimedAmount.",0);
        }
  
        if (claimAmount < claimedAmount) {
          return ResponseService.send(res,StatusCodes.BAD_REQUEST,"Claim amount cannot be less than claimed amount.",0);
        }
  
        // Create insurance entry
        const newInsurance = new Insurance({
          patientId,
          insuranceCompany,
          insurancePlan,
          claimAmount,
          claimedAmount,
        });
  
        const savedInsurance = await newInsurance.save();
        insuranceId = savedInsurance._id;
      }
  
      // Calculate total amount
      const discountedAmount = (amount + extraCharges) - ((amount + extraCharges) * (discount || 0)) / 100;
      const totalAmount = discountedAmount + (discountedAmount * (tax || 0)) / 100;
  
      // Create bill
      const billData = {
        patientId,
        doctorId,
        hospitalId: appointment.hospitalId,
        amount,
        discount,
        tax,
        totalAmount,
        paymentType,
        insuranceId,
        description,
        notes,
        status: false,
        date: new Date(),
        time: new Date().toLocaleTimeString(),
      };
  
      const newBill = new Bill(billData);
      await newBill.save();
  
      return ResponseService.send(res,StatusCodes.CREATED,"Bill created successfully.",1,newBill);
    } catch (error) {
      console.error("Error creating bill manually:", error);
      return ResponseService.send(res,StatusCodes.INTERNAL_SERVER_ERROR,error.message,0);
    }
  }
  
  /**
   * Edits an existing bill
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   * @returns {Object} - Updated bill or error response
   */
  async editBill(req, res) {
    try {
      const { billId } = req.params;
      const {
        amount,
        discount,
        tax,
        paymentType,
        insuranceDetails,
        description,
        status,
        notes,
      } = req.body;
  
      // Fetch the bill from the database
      const bill = await Bill.findById(billId);
      if (!bill) {
        return ResponseService.send(
          res,
          StatusCodes.NOT_FOUND,
          "Bill not found.",
          0
        );
      }
  
      // Update amount
      if (amount !== undefined) {
        if (amount < 0) {
          return ResponseService.send(
            res,
            StatusCodes.BAD_REQUEST,
            "Amount cannot be negative.",
            0
          );
        }
        bill.amount = amount;
      }
  
      // Update discount
      if (discount !== undefined) {
        if (discount < 0 || discount > 100) {
          return ResponseService.send(
            res,
            StatusCodes.BAD_REQUEST,
            "Discount must be between 0 and 100.",
            0
          );
        }
        bill.discount = discount;
      }
  
      // Update tax
      if (tax !== undefined) {
        if (tax < 0) {
          return ResponseService.send(
            res,
            StatusCodes.BAD_REQUEST,
            "Tax cannot be negative.",
            0
          );
        }
        bill.tax = tax;
      }
  
      // Update description
      if (description !== undefined) {
        if (!Array.isArray(description)) {
          return ResponseService.send(
            res,
            StatusCodes.BAD_REQUEST,
            "Description must be an array of key-value pairs.",
            0
          );
        }
        for (const item of description) {
          if (!item.key || !item.value) {
            return ResponseService.send(
              res,
              StatusCodes.BAD_REQUEST,
              "Each description entry must have both 'key' and 'value'.",
              0
            );
          }
        }
        bill.description = description;
      }
  
      // Handle insurance logic
      if (paymentType === "Insurance") {
        if (
          !insuranceDetails ||
          !insuranceDetails.insuranceCompany ||
          !insuranceDetails.insurancePlan ||
          insuranceDetails.claimAmount === undefined ||
          insuranceDetails.claimedAmount === undefined
        ) {
          return ResponseService.send(
            res,
            StatusCodes.BAD_REQUEST,
            "Incomplete insurance details. Provide insuranceCompany, insurancePlan, claimAmount, and claimedAmount.",
            0
          );
        }
  
        if (insuranceDetails.claimAmount < insuranceDetails.claimedAmount) {
          return ResponseService.send(
            res,
            StatusCodes.BAD_REQUEST,
            "Claim amount cannot be less than claimed amount.",
            0
          );
        }
  
        if (bill.insuranceId) {
          // Update existing insurance
          const insurance = await Insurance.findById(bill.insuranceId);
          if (!insurance) {
            return ResponseService.send(
              res,
              StatusCodes.NOT_FOUND,
              "Associated insurance not found.",
              0
            );
          }
  
          insurance.insuranceCompany = insuranceDetails.insuranceCompany;
          insurance.insurancePlan = insuranceDetails.insurancePlan;
          insurance.claimAmount = insuranceDetails.claimAmount;
          insurance.claimedAmount = insuranceDetails.claimedAmount;
          await insurance.save();
        } else {
          // Create new insurance
          const newInsurance = new Insurance({
            patientId: bill.patientId,
            insuranceCompany: insuranceDetails.insuranceCompany,
            insurancePlan: insuranceDetails.insurancePlan,
            claimAmount: insuranceDetails.claimAmount,
            claimedAmount: insuranceDetails.claimedAmount,
          });
  
          const savedInsurance = await newInsurance.save();
          bill.insuranceId = savedInsurance._id;
        }
      }
  
      // Update payment type
      if (paymentType !== undefined) {
        if (!["Online", "Cash", "Insurance"].includes(paymentType)) {
          return ResponseService.send(
            res,
            StatusCodes.BAD_REQUEST,
            "Invalid payment type. Allowed values: Online, Cash, Insurance.",
            0
          );
        }
        bill.paymentType = paymentType;
      }
  
      // Update status
      if (status !== undefined) {
        if (!["Unpaid", "Paid"].includes(status)) {
          return ResponseService.send(
            res,
            StatusCodes.BAD_REQUEST,
            "Invalid status value. Allowed values: Unpaid, Paid.",
            0
          );
        }
        bill.status = status;
      }
  
      // Recalculate total amount if relevant fields are updated
      if (amount !== undefined || discount !== undefined || tax !== undefined) {
        const baseAmount = bill.amount || 0;
        const discountedAmount =
          baseAmount - (baseAmount * (bill.discount || 0)) / 100;
        const totalAmount =
          discountedAmount + (discountedAmount * (bill.tax || 0)) / 100;
        bill.totalAmount = totalAmount;
      }
  
      // Save updated bill
      await bill.save();
  
      return ResponseService.send(
        res,
        StatusCodes.OK,
        "Bill updated successfully.",
        1,
        bill
      );
    } catch (error) {
      console.error("Error updating bill:", error);
      return ResponseService.send(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        error.message,
        0
      );
    }
  }
  
  

  async getBill(req, res) {
    try {
      const { id } = req.query;
  
      // Case where no bill ID is provided, fetch all bills
      if (!id || id.trim() === '') {
        const bills = await Bill.find()
          .populate('patientId', 'fullName email phone age gender address') 
          .populate('doctorId', 'fullName specialization onlineConsultationRate description') 
          .populate('insuranceId') 
          .populate('appointmentId', 'date appointmentTime status dieseas_name');
  
        if (bills && bills.length > 0) {
          return ResponseService.send(res, StatusCodes.OK, "Bills fetched successfully", 1, bills);
        } else {
          return ResponseService.send(res, StatusCodes.NOT_FOUND, "No bills found", 0);
        }
      }
  
      // Fetch the bill by billNumber
      const bill = await Bill.findOne({ billNumber: id })
        .populate('patientId', 'fullName email gender age phone address')
        .populate('doctorId', 'fullName metadata.doctorData.specialization metadata.doctorData.description metadata.doctorData.onlineConsultationRate metadata.doctorData.consultationRate')
        .populate('appointmentId', 'date appointmentTime status dieseas_name');
  
      let formattedAddress = null;
      if (bill && bill.patientId && bill.patientId.address) {
        const address = bill.patientId.address;
        formattedAddress = `${address.fullAddress}, ${address.city}, ${address.state}, ${address.country}, ${address.zipCode}`;
        
        // Optionally remove the original address field
        delete bill.patientId.address;  
      }
  
      // Send response with formattedAddress as top-level data
      if (bill) {
        const responseData = {
          ...bill.toObject(), // Convert bill object to plain JS object
          formattedAddress // Include formattedAddress in top-level data
        };
        return ResponseService.send(res, StatusCodes.OK, "Bill fetched successfully", 1, responseData);
      } else {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "Bill not found", 0);
      }
    } catch (error) {
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
  }
  
  async getBillByStatus(req, res) {
    try {
      const { status } = req.query;
      const hospitalId = req.user.hospitalId; // Extract hospitalId from the request
  
      // Check if status is provided
      if (!status) {
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Status is required", 0);
      }
  
      // Validate the status value
      const validStatuses = ["Unpaid", "Paid"];
      if (!validStatuses.includes(status)) {
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid status value", 0);
      }
  
      // Convert status to boolean for database query
      const statusBool = status === "Paid";
  
      // Fetch bills with the given status and hospitalId
      const bills = await Bill.find({ status: statusBool, hospitalId })
        .populate("patientId", "fullName email phone")
        .populate("doctorId", "fullName")
        .populate("appointmentId", "dieseas_name date appointmentTime status")
        .select("billNumber status date time appointmentId");
  
      // Check if bills were found
      if (!bills || bills.length === 0) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "No bills found", 0);
      }
  
      // Format the bills response
      const formattedBills = bills.map(bill => ({
        billNumber: bill.billNumber,
        patientName: bill.patientId?.fullName || "N/A",
        doctorName: bill.doctorId?.fullName || "N/A",
        diseaseName: bill.appointmentId?.dieseas_name || "N/A",
        phoneNumber: bill.patientId?.phone || "N/A",
        status: bill.status ? "Paid" : "Unpaid",
        billDate: new Date(bill.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        time: bill.time,
      }));
  
      // Return the count of bills along with the formatted bills
      return ResponseService.send(res, StatusCodes.OK, "Bills fetched successfully", 1, {
        count: bills.length,
        bills: formattedBills,
      });
  
    } catch (error) {
      console.error("Error fetching bills:", error);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
  }
  
  

}

export default BillController;
