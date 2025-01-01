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
            let user = await User.findOne({ email: req.body.email });
            if (!user) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User not found", 0);
            }
            let match = await bcrypt.compare(req.body.password, user.password);
            if (match) {
                const secret = user.role === 'admin' ? process.env.JWT_SECRET_ADMIN
                    : user.role === 'doctor' ? process.env.JWT_SECRET_DOCTOR
                        : user.role === 'patient' ? process.env.JWT_SECRET_PATIENT
                            : process.env.JWT_SECRET_RECEPTIONIST;
                if (!secret) {
                    return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "JWT secret is not defined", 0);
                }
                let token = await jwt.sign(
                    { userData: user },
                    secret,
                    { expiresIn: "1d" }
                );
                return res.status(StatusCodes.OK).json({ message: "You're Logged In Successfully 🎉", status: 1, data: token, role: user.role, });
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid Password", 0);
            }
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
}

export default AuthController;
