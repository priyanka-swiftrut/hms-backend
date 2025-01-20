import Bill from '../models/Bill.model.js';
import Insurance from "../models/Insurance.model.js";
import AppointmentModel from "../models/Appointment.model.js";
import User from "../models/User.model.js";
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import sendNotification from '../services/notificationService.js';
class BillController {


  async createBillManualy(req, res) {
    try {
      const {
          appointmentId,
          discount,
          tax: customTax,
          paymentType,
          description,
          insuranceDetails,
          notes,
          status,
      } = req.body;

      // Validate required fields
      if (!appointmentId) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Missing required field: appointmentId.", 0);
      }

      const existingBill = await Bill.findOne({ appointmentId });
      if (existingBill) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Bill already exists.", 0);
      }

      // Fetch appointment details
      const appointment = await AppointmentModel.findById(appointmentId).populate("patientId doctorId");
      if (!appointment) {
          return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment not found.", 0);
      }

      const { patientId, doctorId, hospitalId, type: appointmentType } = appointment;

      // Validate payment type
      if (req.user.role !== "receptionist" && paymentType === "cash" && appointmentType === "online") {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
      }

      // Fetch consultation rate
      const doctor = await User.findById(doctorId);
      if (!doctor) {
          return ResponseService.send(res, StatusCodes.NOT_FOUND, "Doctor not found.", 0);
      }

      const consultationRate = appointmentType === "onsite"
          ? doctor.metaData?.doctorData?.consultationRate || 0
          : appointmentType === "online"
          ? doctor.metaData?.doctorData?.onlineConsultationRate || 0
          : null;

      if (consultationRate === null) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid appointment type.", 0);
      }

      // Validate discount and tax
      if (discount && (discount < 0 || discount > 100)) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Discount must be between 0 and 100.", 0);
      }

      const tax = customTax !== undefined ? customTax : 18;
      if (tax < 0) {
          return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Tax cannot be negative.", 0);
      }

      // Calculate extra charges
      const extraCharges = Array.isArray(description)
          ? description.reduce((acc, item) => {
                if (typeof item.value !== "number") {
                    throw new Error("Each description entry must have a numeric value.");
                }
                return acc + item.value;
            }, 0)
          : 0;

      // Calculate total amount
      const baseAmount = consultationRate + extraCharges;
      const discountedAmount = baseAmount - (baseAmount * (discount || 0)) / 100;
      const totalAmount = discountedAmount + (discountedAmount * tax) / 100;

      // Handle insurance details
      let insuranceId = null;
      let dueAmount = 0;

      if (paymentType === "Insurance") {
          const { insuranceCompany, insurancePlan, claimAmount, claimedAmount } = insuranceDetails || {};

          if (!insuranceCompany || !insurancePlan || claimAmount === undefined || claimedAmount === undefined) {
              return ResponseService.send(
                  res,
                  StatusCodes.BAD_REQUEST,
                  "Incomplete insurance details. Provide insuranceCompany, insurancePlan, claimAmount, and claimedAmount.",
                  0
              );
          }

          if (claimAmount < claimedAmount) {
              return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Claim amount cannot be less than claimed amount.", 0);
          }

          const newInsurance = new Insurance({
              patientId,
              insuranceCompany,
              insurancePlan,
              claimAmount,
              claimedAmount,
          });

          const savedInsurance = await newInsurance.save();
          insuranceId = savedInsurance._id;

          if (claimedAmount < totalAmount) {
              dueAmount = totalAmount - claimedAmount;
          }
      }

      // Create and save bill
      const billData = {
          appointmentId,
          patientId,
          doctorId,
          hospitalId,
          amount: consultationRate,
          discount,
          tax,
          totalAmount,
          dueAmount,
          paymentType,
          insuranceId,
          description,
          notes,
          paymentStatus: status,
          date: new Date(),
          time: new Date().toLocaleTimeString(),
      };

      const newBill = await new Bill(billData).save();

      await sendNotification({
          type: "Bill",
          message: `Bill created successfully on ${newBill.date} at ${newBill.time}`,
          hospitalId,
          targetUsers: patientId,
      });

      return ResponseService.send(res, StatusCodes.CREATED, "Bill created successfully.", 1, newBill);
  } catch (error) {
      console.error("Error creating bill manually:", error);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
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
        bill.paymentStatus = status;
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
  
      // Fetch all bills if no ID is provided
      if (!id?.trim()) {
        const bills = await Bill.find()
          .populate('patientId', 'fullName email phone age gender address')
          .populate('doctorId', 'fullName specialization onlineConsultationRate description')
          .populate('insuranceId')
          .populate('appointmentId', 'date appointmentTime status dieseas_name');
  
        if (bills?.length) {
          return ResponseService.send(res, StatusCodes.OK, "Bills fetched successfully", 1, bills);
        }
  
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "No bills found", 0);
      }
  
      // Fetch the bill by billNumber
      const bill = await Bill.findOne({ billNumber: id })
        .populate('patientId', 'fullName email gender age phone address')
        .populate(
          'doctorId',
          'fullName metadata.doctorData.specialization metadata.doctorData.description metadata.doctorData.onlineConsultationRate metadata.doctorData.consultationRate'
        )
        .populate('appointmentId', 'date appointmentTime status dieseas_name');
  
      if (!bill) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "Bill not found", 0);
      }
  
      // Format the patient's address
      const formattedAddress = bill.patientId?.address
        ? `${bill.patientId.address.fullAddress}, ${bill.patientId.address.city}, ${bill.patientId.address.state}, ${bill.patientId.address.country}, ${bill.patientId.address.zipCode}`
        : null;
  
      // Optionally remove the original address field
      if (bill.patientId?.address) {
        delete bill.patientId.address;
      }
  
      // Add formattedAddress to the response
      const responseData = {
        ...bill.toObject(), // Convert Mongoose document to plain JavaScript object
        formattedAddress,
      };
  
      return ResponseService.send(res, StatusCodes.OK, "Bill fetched successfully", 1, responseData);
    } catch (error) {
      console.error("Error fetching bill:", error);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
  }

  async getBillByStatus(req, res) {
    try {
      const { status } = req.query;
      const { hospitalId } = req.user; // Destructure hospitalId from the request user
  
      // Validate the status parameter
      if (!status) {
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Status is required", 0);
      }
  
      const validStatuses = ["Unpaid", "Paid"];
      if (!validStatuses.includes(status)) {
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid status value", 0);
      }
  
      // Map status to boolean for the database query
      const paymentStatus = status === "Paid";
  
      // Fetch bills based on status and hospitalId
      const bills = await Bill.find({ paymentStatus, hospitalId })
        .populate("patientId", "fullName email phone")
        .populate("doctorId", "fullName")
        .populate("appointmentId", "dieseas_name date appointmentTime status")
        .select("billNumber paymentStatus date time appointmentId");
  
      if (!bills?.length) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "No bills found", 0);
      }
  
      // Format the bills for response
      const formattedBills = bills.map(({ billNumber, patientId, doctorId, appointmentId, paymentStatus, date, time }) => ({
        billNumber,
        patientName: patientId?.fullName || "N/A",
        doctorName: doctorId?.fullName || "N/A",
        diseaseName: appointmentId?.dieseas_name || "N/A",
        phoneNumber: patientId?.phone || "N/A",
        status: paymentStatus ? "Paid" : "Unpaid",
        billDate: new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        time,
      }));
  
      // Return the response with the count and formatted bills
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
