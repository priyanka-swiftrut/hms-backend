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
                let checkmail = await User.findOne({ email: req.body.email });
                if (checkmail) {
                    return sendResponse(res, StatusCodes.BAD_REQUEST, "Email Already Exists", 0);
                } else {
                    let pass = await bcrypt.hash(req.body.password, 10);
                    req.body.password = pass;
                    req.body.role = "admin";
                    req.body.fullName = req.body.firstname + " " + req.body.lastname;
                    if (req.files) {
                        if (req.files?.profilePicture?.[0]?.path) {
                            req.body.profilePicture = req.files.profilePicture[0].path;
                        }
                    }
                    let newUser = new User(req.body);
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

    async EditProfile(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            let user = await User.findById(req.params.id);
            if (user) {
                if (req.files) {
                    if (req.files) {
                        if (req.files?.profilePicture?.[0]?.path) {
                            if (user.profilePicture) {
                                const publicId = user.profilePicture.split("/").pop().split(".")[0];
                                await cloudinaryConfig.uploader.destroy(`profileImages/${publicId}`);
                            }
                            req.body.profilePicture = req.files.profilePicture[0].path;
                        }
                    }
                    req.body.fullName = req.body.firstname + " " + req.body.lastname;
                    let updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
                    if (updatedUser) {
                        return sendResponse(res, StatusCodes.OK, "Profile Updated Successfully", 1, updatedUser);
                    } else {
                        return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to Update Profile", 0);
                    }
                } else {
                    return sendResponse(res, StatusCodes.BAD_REQUEST, "User Not Found", 0);
                }
            }
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async deleteProfile(req, res) {
        try {
            let user = await User.findById(req.params.id);
            if (user) {
                if (user.profilePicture) {
                    const publicId = user.profilePicture.split("/").pop().split(".")[0];
                    await cloudinaryConfig.uploader.destroy(`profileImages/${publicId}`);
                }
                req.body.isActive = false;
                let deletedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
                if (deletedUser) {
                    return sendResponse(res, StatusCodes.OK, "Profile Deleted Successfully", 1, deletedUser);
                } else {
                    return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to Delete Profile", 0);
                }
            } else {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "User Not Found", 0);
            }
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

}
export default AdminController;