import User from '../models/User.model.js';
import { StatusCodes } from 'http-status-codes';
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { sendOtp, verifyOtp } from '../services/twilioService.js';


class AuthController {

    async Login(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
    
            const { identifier, password } = req.body;
    
            if (!identifier) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Identifier (email or phone number) is required", 0);
            }
    
            if (!password) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Password is required", 0);
            }
    
            let user;
    
            if (identifier.includes("@")) {
                // Email-based login
                user = await User.findOne({ email: identifier });
                if (!user) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User not found with this email", 0);
                }
            } else {
                // Phone number-based login
                user = await User.findOne({ phone: identifier });
                if (!user) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User not found with this phone number", 0);
                }
            }
    
            // Password validation
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid Password", 0);
            }
    
            const secret = user.role === 'admin' ? process.env.JWT_SECRET_ADMIN
                : user.role === 'doctor' ? process.env.JWT_SECRET_DOCTOR
                    : user.role === 'patient' ? process.env.JWT_SECRET_PATIENT
                        : process.env.JWT_SECRET_RECEPTIONIST;
    
            if (!secret) {
                return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "JWT secret is not defined", 0);
            }
    
            const token = jwt.sign({ userData: user }, secret, { expiresIn: "1d" });
            return res.status(StatusCodes.OK).json({
                message: "You're Logged In Successfully 🎉",
                status: 1,
                data: token,
                role: user.role,
            });
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async ForgotPassword(req, res) {
        try {
            const { identifier } = req.body;
    
            if (!identifier) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Identifier (email or phone number) is required", 0);
            }
    
            let user;
            let otp;
    
            if (identifier.includes("@")) {
                // Email-based forgot password
                user = await User.findOne({ email: identifier });
                if (!user) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email not found", 0);
                }
    
                otp = Math.floor(100000 + Math.random() * 900000); // Generate a random OTP
                res.cookie("otp", otp, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "Strict" });
                res.cookie("email", user.email);
    
                const transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.PASSWORD,
                    },
                });
    
                await transporter.sendMail({
                    from: process.env.EMAIL,
                    to: user.email,
                    subject: "Forgot Password OTP ✔",
                    text: `Hello ${user.name}`,
                    html: `<p>Your OTP is ${otp}</p>`,
                });
    
                return ResponseService.send(res, StatusCodes.OK, "OTP Sent Successfully via Email", 1);
            } else {
                // Phone number-based forgot password
                user = await User.findOne({ phone: identifier });
    
                if (!user) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Phone number not found", 0);
                }
    
                // Send OTP via SMS using Twilio
                try {
                    otp = Math.floor(100000 + Math.random() * 900000); // Generate OTP to send via SMS
                    const response = await sendOtp(identifier, otp); // Send OTP using Twilio
                    return ResponseService.send(res, StatusCodes.OK, "OTP sent successfully via SMS", 1, { sid: response.sid });
                } catch (error) {
                    console.error("Failed to send OTP:", error.message);
                    return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to send OTP", 0);
                }
            }
        } catch (error) {
            console.error("Error in ForgotPassword:", error.message);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", 0);
        }
    }
    
    


    async ResetPassword(req, res) {
        try {
            if (req.body !== "") {
                let checkmail = await User.findOne({ email: req.body.email });
                if (checkmail) {
                    const isSamePassword = await bcrypt.compare(
                        req.body.password,
                        checkmail.password
                    );
                    if (isSamePassword) {
                        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "New password must be different from the current password", 0);
                    } else {
                        if (req.body.password !== "" && req.body.password === req.body.confirmPassword) {
                            let pass = await bcrypt.hash(req.body.password, 10);
                            req.body.password = pass;
                            await User.findByIdAndUpdate(checkmail._id, req.body);
                            return ResponseService.send(res, StatusCodes.OK, "Password Reset Successfully 🎉", 1);
                        } else {
                            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Password and Confirm Password must be same", 0);
                        }
                    }
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email is Incorrect", 0);
                }
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Data Not Found", 0);
            }
        } catch (error) {
            console.log(error.message);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", 0);
        }
    }

    async Logout(req, res) {
        try {
            res.clearCookie("otp");
            res.clearCookie("email");
            req.session.destroy((err) => {
                if (err) {
                    return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to Log out", 0);
                }
                return ResponseService.send(res, StatusCodes.OK, "Logged Out Successfully", 1);
            });
        } catch (error) {
            console.error(error.message);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", 0);
        }
    }

    async VerifyOtp(req, res) {
        try {
            const { otp, phoneNumber } = req.body; // Include phoneNumber in the request
    
            if (!otp || !phoneNumber) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "OTP and phone number are required", 0);
            }
    
            // Verify OTP sent via Twilio
            const response = await verifyOtp(phoneNumber, otp); // Verify OTP using Twilio API
    
            if (response.status === "approved") {
                // Check if the OTP in the cookie matches the one entered by the user (if using email-based verification)
                const otpCookie = req.cookies.otp;
                if (otpCookie && otpCookie.toString() === otp) {
                    return ResponseService.send(res, StatusCodes.OK, "OTP Verified Successfully 🎉", 1);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid OTP", 0);
                }
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid OTP", 0);
            }
        } catch (error) {
            console.log(error.message);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", 0);
        }
    }
    

    async changePassword(req, res) {
        try {
            const userId = req.user.id; // Get user ID from req.user
            const { currentPassword, newPassword, confirmPassword } = req.body;
    
            if (!userId) {
                return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
            }
    
            // Validate input
            if (!currentPassword || !newPassword || !confirmPassword) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "All fields are required", 0);
            }
    
            if (newPassword !== confirmPassword) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "New password and confirm password must match", 0);
            }
    
            // Fetch user from the database
            const user = await User.findById(userId);
            if (!user) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "User not found", 0);
            }
    
            // Check if currentPassword matches the stored password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Old password is incorrect", 0);
            }
    
            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
    
            // Update the user's password with limited validation
            user.password = hashedPassword;
            await user.save({ validateModifiedOnly: true }); // Save only modified fields
    
            return ResponseService.send(res, StatusCodes.OK, "Password changed successfully", 1);
        } catch (error) {
            console.error(error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Server error. Please try again later.", 0);
        }
    }
    
}

export default AuthController;