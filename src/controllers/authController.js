import User from '../models/User.model.js';
import { StatusCodes } from 'http-status-codes';
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';



class AuthController {

    async Login(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
    
            const { email, phoneNumber, password, otp } = req.body;
    
            let user;
            if (email) {
                // Find user by email
                user = await User.findOne({ email });
                if (!user) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User not found", 0);
                }
    
                // Check password
                const match = await bcrypt.compare(password, user.password);
                if (!match) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid Password", 0);
                }
            } else if (phoneNumber) {
                // Find user by phone number
                user = await User.findOne({ phoneNumber });
                if (!user) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User not found", 0);
                }
    
                if (!otp) {
                    // Send OTP if not provided
                    const response = await sendOtp(phoneNumber);
                    return ResponseService.send(res, StatusCodes.OK, "OTP sent successfully", 1, { sid: response.sid });
                } else {
                    // Verify OTP if provided
                    const verifyResponse = await verifyOtp(phoneNumber, otp);
                    if (verifyResponse.status !== "approved") {
                        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid OTP", 0);
                    }
                }
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email or Phone number is required", 0);
            }
    
            // Generate JWT token based on the user role
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
            if (!req.body.email) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email is Required", 0);
            }
            const checkmail = await User.findOne({ email: req.body.email });
            if (!checkmail) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email is Incorrect", 0);
            }
            const otp = Math.floor(100000 + Math.random() * 900000);
            res.cookie("otp", otp, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "Strict" });
            this.OTP = otp;
            res.cookie("email", checkmail.email);

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
                to: checkmail.email,
                subject: "Forgot Password OTP ✔",
                text: `Hello ${checkmail.name}`,
                html: `<p>Your OTP is ${otp}</p>`,
            });

            return ResponseService.send(res, StatusCodes.OK, "OTP Sent Successfully", 1);
        } catch (error) {
            console.error(error.message);
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
            if (req.body !== "") {
                let sendedOtp = req.cookies.otp ? req.cookies.otp : this.OTP;
                if (req.body.otp == sendedOtp) {
                    this.OTP = "";
                    return ResponseService.send(res, StatusCodes.OK, "OTP Verified Successfully 🎉", 1);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid OTP", 0);
                }
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Data Not Found", 0);
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


// import User from '../models/User.model.js';
// import { StatusCodes } from 'http-status-codes';
// import ResponseService from '../services/response.services.js';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import nodemailer from 'nodemailer';



// class AuthController {

//     async Login(req, res) {
//         try {
//             if (!req.body || Object.keys(req.body).length === 0) {
//                 return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
//             }
    
//             const { email, phoneNumber, password, otp } = req.body;
    
//             let user;
//             if (email) {
//                 // Find user by email
//                 user = await User.findOne({ email });
//                 if (!user) {
//                     return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User not found", 0);
//                 }
    
//                 // Check password
//                 const match = await bcrypt.compare(password, user.password);
//                 if (!match) {
//                     return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid Password", 0);
//                 }
//             } else if (phoneNumber) {
//                 // Find user by phone number
//                 user = await User.findOne({ phoneNumber });
//                 if (!user) {
//                     return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User not found", 0);
//                 }
    
//                 if (!otp) {
//                     // Send OTP if not provided
//                     const response = await sendOtp(phoneNumber);
//                     return ResponseService.send(res, StatusCodes.OK, "OTP sent successfully", 1, { sid: response.sid });
//                 } else {
//                     // Verify OTP if provided
//                     const verifyResponse = await verifyOtp(phoneNumber, otp);
//                     if (verifyResponse.status !== "approved") {
//                         return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid OTP", 0);
//                     }
//                 }
//             } else {
//                 return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email or Phone number is required", 0);
//             }
    
//             // Generate JWT token based on the user role
//             const secret = user.role === 'admin' ? process.env.JWT_SECRET_ADMIN
//                 : user.role === 'doctor' ? process.env.JWT_SECRET_DOCTOR
//                     : user.role === 'patient' ? process.env.JWT_SECRET_PATIENT
//                         : process.env.JWT_SECRET_RECEPTIONIST;
    
//             if (!secret) {
//                 return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "JWT secret is not defined", 0);
//             }
    
//             const token = jwt.sign({ userData: user }, secret, { expiresIn: "1d" });
//             return res.status(StatusCodes.OK).json({
//                 message: "You're Logged In Successfully 🎉",
//                 status: 1,
//                 data: token,
//                 role: user.role,
//             });
//         } catch (error) {
//             return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
//         }
//     }
    
//     async ForgotPassword(req, res) {
//         try {
//             const { email, phone } = req.body;
    
//             if (!email && !phone) {
//                 return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email or Phone Number is required", 0);
//             }
    
//             let user;
//             if (email) {
//                 user = await User.findOne({ email });
//                 if (!user) {
//                     return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email not found", 0);
//                 }
//             } else if (phone) {
//                 user = await User.findOne({ phone });
//                 if (!user) {
//                     return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Phone number not found", 0);
//                 }
    
//                 // Generate OTP and send via SMS
//                 const response = await sendOtp(phone);
//                 return ResponseService.send(res, StatusCodes.OK, "OTP sent successfully", 1, { sid: response.sid });
//             }
    
//             // Email flow remains the same
//             const otp = Math.floor(100000 + Math.random() * 900000);
//             res.cookie("otp", otp, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "Strict" });
//             this.OTP = otp;
//             res.cookie("email", user.email);
    
//             const transporter = nodemailer.createTransport({
//                 host: "smtp.gmail.com",
//                 port: 465,
//                 secure: true,
//                 auth: {
//                     user: process.env.EMAIL,
//                     pass: process.env.PASSWORD,
//                 },
//             });
    
//             await transporter.sendMail({
//                 from: process.env.EMAIL,
//                 to: user.email,
//                 subject: "Forgot Password OTP ✔",
//                 text: `Hello ${user.name}`,
//                 html: `<p>Your OTP is ${otp}</p>`,
//             });
    
//             return ResponseService.send(res, StatusCodes.OK, "OTP Sent Successfully", 1);
//         } catch (error) {
//             console.error(error.message);
//             return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", 0);
//         }
//     }
    

//     async ResetPassword(req, res) {
//         try {
//             if (req.body !== "") {
//                 let checkmail = await User.findOne({ email: req.body.email });
//                 if (checkmail) {
//                     const isSamePassword = await bcrypt.compare(
//                         req.body.password,
//                         checkmail.password
//                     );
//                     if (isSamePassword) {
//                         return ResponseService.send(res, StatusCodes.BAD_REQUEST, "New password must be different from the current password", 0);
//                     } else {
//                         if (req.body.password !== "" && req.body.password === req.body.confirmPassword) {
//                             let pass = await bcrypt.hash(req.body.password, 10);
//                             req.body.password = pass;
//                             await User.findByIdAndUpdate(checkmail._id, req.body);
//                             return ResponseService.send(res, StatusCodes.OK, "Password Reset Successfully 🎉", 1);
//                         } else {
//                             return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Password and Confirm Password must be same", 0);
//                         }
//                     }
//                 } else {
//                     return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email is Incorrect", 0);
//                 }
//             } else {
//                 return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Data Not Found", 0);
//             }
//         } catch (error) {
//             console.log(error.message);
//             return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", 0);
//         }
//     }

//     async Logout(req, res) {
//         try {
//             res.clearCookie("otp");
//             res.clearCookie("email");
//             req.session.destroy((err) => {
//                 if (err) {
//                     return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to Log out", 0);
//                 }
//                 return ResponseService.send(res, StatusCodes.OK, "Logged Out Successfully", 1);
//             });
//         } catch (error) {
//             console.error(error.message);
//             return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", 0);
//         }
//     }

//     async VerifyOtp(req, res) {
//         try {
//             if (req.body !== "") {
//                 let sendedOtp = req.cookies.otp ? req.cookies.otp : this.OTP;
//                 if (req.body.otp == sendedOtp) {
//                     this.OTP = "";
//                     return ResponseService.send(res, StatusCodes.OK, "OTP Verified Successfully 🎉", 1);
//                 } else {
//                     return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid OTP", 0);
//                 }
//             } else {
//                 return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Data Not Found", 0);
//             }
//         } catch (error) {
//             console.log(error.message);
//             return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", 0);
//         }
//     }

//     async changePassword(req, res) {
//         try {
//             const userId = req.user.id; // Get user ID from req.user
//             const { currentPassword, newPassword, confirmPassword } = req.body;
    
//             if (!userId) {
//                 return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
//             }
    
//             // Validate input
//             if (!currentPassword || !newPassword || !confirmPassword) {
//                 return ResponseService.send(res, StatusCodes.BAD_REQUEST, "All fields are required", 0);
//             }
    
//             if (newPassword !== confirmPassword) {
//                 return ResponseService.send(res, StatusCodes.BAD_REQUEST, "New password and confirm password must match", 0);
//             }
    
//             // Fetch user from the database
//             const user = await User.findById(userId);
//             if (!user) {
//                 return ResponseService.send(res, StatusCodes.NOT_FOUND, "User not found", 0);
//             }
    
//             // Check if currentPassword matches the stored password
//             const isMatch = await bcrypt.compare(currentPassword, user.password);
//             if (!isMatch) {
//                 return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Old password is incorrect", 0);
//             }
    
//             // Hash the new password
//             const salt = await bcrypt.genSalt(10);
//             const hashedPassword = await bcrypt.hash(newPassword, salt);
    
//             // Update the user's password with limited validation
//             user.password = hashedPassword;
//             await user.save({ validateModifiedOnly: true }); // Save only modified fields
    
//             return ResponseService.send(res, StatusCodes.OK, "Password changed successfully", 1);
//         } catch (error) {
//             console.error(error);
//             return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Server error. Please try again later.", 0);
//         }
//     }
    
// }


