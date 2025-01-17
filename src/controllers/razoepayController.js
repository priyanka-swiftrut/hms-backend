import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.model.js';
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
        const { appointmentType, doctorId, paymentType, insuranceDetails } = req.body;

        // Validate required fields
        if (!appointmentType || !doctorId || !paymentType) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid request data.", 0);
        }

        // Find the doctor
        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return ResponseService.send(res, StatusCodes.NOT_FOUND, "Doctor not found.", 0);
        }

        // Calculate amount and tax
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

        const totalAmount = Math.round((amount + tax) * 100); // Convert to paise (smallest currency unit)

        if (paymentType === "Insurance") {
            const { claimAmount, claimedAmount } = insuranceDetails || {};
            
            // Validate insurance details
            if (claimAmount === undefined || claimedAmount === undefined) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Insurance details are incomplete.", 0);
            }
            if (claimAmount < claimedAmount) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Claim amount cannot be less than claimed amount.", 0);
            }

            // Calculate the remaining amount to be paid by the user
            let dueAmount = 0;
            if (claimedAmount < totalAmount) {
                dueAmount = totalAmount - claimedAmount;
            }

            if (dueAmount > 0) {
                // Create Razorpay order for the remaining amount
                const options = {
                    amount: dueAmount, // Remaining amount in paise
                    currency: "INR",
                    receipt: "receipt_" + Date.now(),
                };

                console.log("Order options:", options);

                const order = await razorpay.orders.create(options);
                console.log("Order created successfully:", order);

                return ResponseService.send(res, StatusCodes.OK, {
                    order,
                    dueAmountInRupees: dueAmount / 100, // Return due amount in rupees
                    paymentCoveredByInsurance: claimedAmount / 100,
                } ,1 );
            } else {
                // Full amount is covered by insurance
                return ResponseService.send(res, StatusCodes.OK, {
                    message: "Total amount covered by insurance.",
                    paymentCoveredByInsurance: claimedAmount / 100,
                } , 1);
            }
        } else if (paymentType === "Direct") {
            // Handle direct payment via Razorpay
            const options = {
                amount: totalAmount, // Total amount in paise
                currency: "INR",
                receipt: "receipt_" + Date.now(),
            };

            console.log("Order options:", options);

            const order = await razorpay.orders.create(options);
            console.log("Order created successfully:", order);

            return ResponseService.send(res, StatusCodes.OK, { order, totalAmountInRupees: totalAmount / 100 } , 1);
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
            razorpay_signature
        } = req.body;

        console.log(razorpay_order_id, razorpay_payment_id, razorpay_signature , "--------------");
        

        // Create a signature to verify the payment
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment is verified

            return ResponseService.send(res, StatusCodes.OK, { verified: true, message: "Payment verified successfully" } , 1);
        } else {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid signature", 0);
        }
    } catch (error) {
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
}