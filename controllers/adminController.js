import User from '../models/User.model.js';
import sendResponse from '../services/response.services.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { StatusCodes } from 'http-status-codes';
import regestration from '../services/emailTemplate.js';

class AdminController {
    async Register(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            if (req.body.password !== "" && req.body.password === req.body.confirmPassword) {
                let checkmail = await UserModel.findOne({ email: req.body.email });
                if (checkmail) {
                    return sendResponse(res, StatusCodes.BAD_REQUEST, "Email Already Exists", 0);
                } else {
                    let pass = await bcrypt.hash(req.body.password, 10);
                    req.body.password = pass;
                    req.body.fullName = req.body.firstname + " " + req.body.lastname;
                    let newUser = new UserModel(req.body);
                    await newUser.save();
                    if (newUser) {
                        try {
                            const transporter = nodemailer.createTransport({
                                host: "smtp.gmail.com",
                                port: 465,
                                secure: true,
                                auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
                            });
                            const htmlMessage = regestration(req.body.fullName, req.body.email, password);
                            await transporter.sendMail({
                                from: process.env.EMAIL,
                                to: req.body.email,
                                subject: "Registration Successful ✔",
                                text: `Hello ${req.body.fullName}, You've successfully registered.`,
                                html: htmlMessage,
                            });
                        } catch (emailError) {
                            return sendResponse(res, StatusCodes.BAD_REQUEST, "User registered, but email sending failed", 0);
                        }
                        return sendResponse(res, StatusCodes.OK, "Admin Registered Successfully", 1, newUser);
                    } else {
                        return sendResponse(res, StatusCodes.BAD_REQUEST, "Something went wrong", 0);
                    }
                }
            } else {
                return sendResponse(res, 400, "Password and Confirm Password is Not Matched", 0);
            }
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }
}

export default AdminController;