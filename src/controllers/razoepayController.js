import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.model.js';
import Bill from '../models/Bill.model.js';
import Appointment from '../models/Appointment.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';


// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
export const createOrder = async (req, res) => {
    try {
        const { appointmentType, doctorId, paymentType, insuranceDetails, billId } = req.body;

        // Handle scenario with `billId`
        if (billId) {
            const bill = await Bill.findById(billId);
            if (!bill) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Bill not found.", 0);
            }

            const { insuranceId, dueAmount, totalAmount } = bill;

            let amountToPay = 0;

            if (insuranceId) {
                // Use `dueAmount` if insuranceId is provided
                if (!dueAmount) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Due amount is missing for the bill.", 0);
                }
                amountToPay = dueAmount;
            } else {
                // Use `totalAmount` if insuranceId is not provided
                if (!totalAmount) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Total amount is missing for the bill.", 0);
                }
                amountToPay = totalAmount;
            }

            // Create Razorpay order for the amount to be paid
            const options = {
                amount: Math.round(amountToPay * 100), // Convert to paise
                currency: "INR",
                receipt: "receipt_" + Date.now(),
            };

            console.log("Order options:", options);

            const order = await razorpay.orders.create(options);
            console.log("Order created successfully:", order);

            return ResponseService.send(
                res,
                StatusCodes.OK,
                {
                    order,
                    amountToPayInRupees: amountToPay,
                },
                1
            );
        }

        // Original logic for creating order without `billId`
        if (!appointmentType || !doctorId || !paymentType) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid request data.", 0);
        }

        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return ResponseService.send(res, StatusCodes.NOT_FOUND, "Doctor not found.", 0);
        }

        let amount = 0;
        let tax = 0;

        if (appointmentType === "online") {
            amount = doctor.metaData.doctorData.onlineConsultationRate;
            tax = amount * 0.18; // 18% tax
        } else if (appointmentType === "onsite") {
            amount = doctor.metaData.doctorData.consultationRate;
            tax = amount * 0.18; // 18% tax
        } else {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid appointment type.", 0);
        }

        const totalAmount = Math.round((amount + tax) * 100); // Convert to paise

        if (paymentType === "Insurance") {
            const { claimAmount, claimedAmount } = insuranceDetails || {};
            if (claimAmount === undefined || claimedAmount === undefined) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Insurance details are incomplete.", 0);
            }
            if (claimAmount < claimedAmount) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Claim amount cannot be less than claimed amount.", 0);
            }

            let dueAmount = 0;
            if (claimedAmount < totalAmount) {
                dueAmount = totalAmount - claimedAmount;
            }

            if (dueAmount > 0) {
                const options = {
                    amount: dueAmount,
                    currency: "INR",
                    receipt: "receipt_" + Date.now(),
                };

                const order = await razorpay.orders.create(options);
                return ResponseService.send(res, StatusCodes.OK, {
                    order,
                    dueAmountInRupees: dueAmount / 100,
                    paymentCoveredByInsurance: claimedAmount / 100,
                }, 1);
            } else {
                return ResponseService.send(res, StatusCodes.OK, {
                    message: "Total amount covered by insurance.",
                    paymentCoveredByInsurance: claimedAmount / 100,
                }, 1);
            }
        } else if (paymentType === "Direct") {
            const options = {
                amount: totalAmount,
                currency: "INR",
                receipt: "receipt_" + Date.now(),
            };

            const order = await razorpay.orders.create(options);
            return ResponseService.send(res, StatusCodes.OK, { order, totalAmountInRupees: totalAmount / 100 }, 1);
        } else {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
        }
    } catch (error) {
        console.error("Error creating order:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
};





// Verify payment
export const verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            billId 
        } = req.body;

        console.log(razorpay_order_id, razorpay_payment_id, razorpay_signature, "--------------");

        // Create a signature to verify the payment
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment is verified
            if (billId) {
                // Update the bill's paymentStatus to true
                const bill = await Bill.findById(billId);
                if (!bill) {
                    return ResponseService.send(res, StatusCodes.NOT_FOUND, "Bill not found.", 0);
                }

                // Update the payment status
                bill.paymentStatus = true;
                await bill.save();

                return ResponseService.send(
                    res,
                    StatusCodes.OK,
                    { verified: true, message: "Payment verified and bill status updated successfully" },
                    1
                );
            } else {
                // No billId provided, just return verification success
                return ResponseService.send(
                    res,
                    StatusCodes.OK,
                    { verified: true, message: "Payment verified successfully" },
                    1
                );
            }
        } else {
            // Invalid signature
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid signature", 0);
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
};
