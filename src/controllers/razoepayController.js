import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.model.js';
import Appointment from '../models/Appointment.model.js';

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
export const createOrder = async (req, res) => {
    try {
        const { appointmentType, doctorId } = req.body;

        // Validate required fields
        if (!appointmentType || !doctorId) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // Find the doctor
        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: "Doctor not found." });
        }

        // Calculate amount and tax
        let amount = 0;
        let tax = 0;

        if (appointmentType === "online") {
            console.log("Online consultation");
            amount = doctor.metaData.doctorData.onlineConsultationRate;
            tax = amount * 0.18; // 18% tax
        } else if (appointmentType === "onsite") {
            console.log("Onsite consultation");
            amount = doctor.metaData.doctorData.consultationRate;
            tax = amount * 0.18; // 18% tax
        } else {
            return res.status(400).json({ error: "Invalid appointment type." });
        }

        const totalAmount = Math.round((amount + tax) * 100); // Convert to paise (smallest currency unit)

        // Razorpay order options
        const options = {
            amount: totalAmount, // Amount in paise
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };

        console.log("Order options:", options);

        // Create Razorpay order
        const order = await razorpay.orders.create(options);
        console.log("Order created successfully:", order);

        // Send response
        res.status(200).json({ order, totalAmountInRupees: totalAmount / 100 }); // Return total amount in rupees as well
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: error.message });
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
            res.json({ verified: true, message: "Payment verified successfully" });
        } else {
            res.status(400).json({ verified: false, message: "Invalid signature" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}