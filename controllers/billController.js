import Bill from '../models/Bill.model.js';
import Insurance from "../models/Insurance.model.js";
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';

class BillController {
    /**
     * Edits an existing bill
     * @param {Object} req - The request object
     * @param {Object} res - The response object
     * @returns {Object} - Updated bill or error response
     */
    async editBill(req, res) {
        try {
            const { billId } = req.params;
            const { amount, discount, tax, paymentType, insuranceDetails, description, status } = req.body;
    
            const bill = await Bill.findById(billId);
            if (!bill) {
                return ResponseService.sendResponse(res, StatusCodes.NOT_FOUND, "Bill not found.", 0);
            }

            if (amount !== undefined) bill.amount = amount;

            if (discount !== undefined) {
                if (discount < 0 || discount > 100) {
                    return ResponseService.sendResponse(res, StatusCodes.BAD_REQUEST, "Discount must be between 0 and 100.", 0);
                }
                bill.discount = discount;
            }

            if (tax !== undefined) {
                if (tax < 0) {
                    return ResponseService.sendResponse(res, StatusCodes.BAD_REQUEST, "Tax cannot be negative.", 0);
                }
                bill.tax = tax;
            }

            if (description && Array.isArray(description)) {
                bill.description = description;
            }
            
            if (paymentType === "Insurance") {
                if (!insuranceDetails || !insuranceDetails.insuranceCompany || !insuranceDetails.insurancePlan || !insuranceDetails.claimAmount || !insuranceDetails.claimedAmount) {
                    return ResponseService.sendResponse(
                        res,
                        StatusCodes.BAD_REQUEST,
                        "Incomplete insurance details. Provide insuranceCompany, insurancePlan, claimAmount, and claimedAmount.",
                        0
                    );
                }
    
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
    
            if (status !== undefined) {
                if (!["Unpaid", "Paid"].includes(status)) {
                    return ResponseService.sendResponse(res, StatusCodes.BAD_REQUEST, "Invalid status value.", 0);
                }
                bill.status = status;
            }
    
            if (amount !== undefined || discount !== undefined || tax !== undefined) {
                const discountedAmount = amount - (amount * (bill.discount || 0)) / 100;
                bill.totalAmount = discountedAmount + (discountedAmount * (bill.tax || 0)) / 100;
            }
    
            await bill.save();
    
            return ResponseService.send(res, StatusCodes.OK, "Bill updated successfully.", 1, bill);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
    }
    

    async getBill(req, res) {
        try {
            const { id } = req.query;

            if (!id || id.trim() === '') {
                const bills = await Bill.find()
                    .populate('patientId', 'fullName email phone age gender address') // Populate patient details
                    .populate('doctorId', 'fullName specialization onlineConsultationRate description') // Populate doctor details
                    .populate('insuranceId') // Populate doctor details
                    .populate('appointmentId', 'date appointmentTime status  dieseas_name'); // Populate appointment details
                if (bills && bills.length > 0) {
                    return ResponseService.send(res, StatusCodes.OK, "Bills fetched successfully", 1, bills);
                } else {
                    return ResponseService.send(res, StatusCodes.NOT_FOUND, "No bills found", 0);
                }
            }

            const bill = await Bill.findById(id)
                .populate('patientId', 'name email')
                .populate('doctorId', 'name specialization')
                .populate('appointmentId', 'date appointmentTime status');

            if (bill) {
                return ResponseService.send(res, StatusCodes.OK, "Bill fetched successfully", 1, bill);
            } else {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Bill not found", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }
}

export default BillController;