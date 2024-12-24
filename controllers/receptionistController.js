import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import cloudinary from '../config/cloudinaryConfig.js';
import crypto from 'crypto';
import EmailService from '../services/email.service.js';


class ReceptionistController {

    async Register(req, res) {
        try {
            if (!req.user || req.user.role !== "admin") {
                return ResponseService.send(res, StatusCodes.FORBIDDEN, "Access denied. Admin only.", 0);
            }
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            const hospitalId = req.user.hospitalId;
            if (!hospitalId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Hospital ID is required", 0);
            }
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email already exists", 0);
            }

            const password = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await bcrypt.hash(password, 10);

            const newReceptionistData = {
                fullName: `${req.body.firstName} ${req.body.lastName}`,
                email: req.body.email,
                phone: req.body.phone,
                age: req.body.age,
                gender: req.body.gender,
                hospitalId: hospitalId,
                address: {
                    country: req.body.country,
                    state: req.body.state,
                    city: req.body.city,
                    zipCode: req.body.zipCode,
                    fullAddress: req.body.fullAddress,
                },
                role: "receptionist",
                password: hashedPassword,
                metaData: {
                    receptionistData: {
                        qualification: req.body.qualification,
                        emergencyContactNo: req.body.emergencyContactNo,
                        workingTime: req.body.workingTime,
                        breakTime: req.body.breakTime,
                    },
                },
            };
            if (req.files?.profilePicture?.[0]?.path) {
                newReceptionistData.profilePicture = req.files.profilePicture[0].path;
            }
            const newReceptionist = new User(newReceptionistData);
            await newReceptionist.save();
            try {
                const emailHtml = EmailService.registrationTemplate(newReceptionist.fullName, newReceptionist.email, req.body.password);
                await EmailService.sendEmail(newReceptionist.email, "Registration Successful ✔", emailHtml);
            } catch (emailError) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Receptionist registered, but email sending failed", 0);
            }
            return ResponseService.send(res, StatusCodes.OK, "Receptionist registered successfully", 1, newReceptionist);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async EditProfile(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            const Receptionist = await User.findById(req.user._id);
            if (!Receptionist) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Receptionist not found", 0);
            }
            if (req.files) {
                if (req.files?.profilePicture?.[0]?.path) {
                    if (Receptionist.profilePicture && Receptionist.profilePicture !== "") {
                        const publicId = Receptionist.profilePicture.split("/").pop().split(".")[0];
                        await cloudinary.uploader.destroy(`profileImages/${publicId}`);
                    }
                    req.body.profilePicture = req.files.profilePicture[0].path;
                }
            }
            const updateReceptionist = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
            if (updateReceptionist) {
                return ResponseService.send(res, StatusCodes.OK, "Receptionist profile updated successfully", 1, updateReceptionist);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update Receptionist profile", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async deleteProfile(req, res) {
        try {
            const receptionist = await User.findById(req.params.id);
            if (!receptionist) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "receptionist not found", 0);
            }
            const updateReceptionist = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
            if (updateReceptionist) {
                return ResponseService.send(res, StatusCodes.OK, "receptionist profile deleted successfully", 1, updateReceptionist);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to delete receptionist profile", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }
    async getreceptionist(req, res) {
        try {
            if (req.query.id === '' || req.query.id === undefined || req.query.id === null) {
                const receptionist = await User.find({ role: 'receptionist', isActive: true });
                if (receptionist) {
                    return ResponseService.send(res, StatusCodes.OK, "receptionist fetched successfully", 1, receptionist);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch receptionist", 0);
                }
            }
            else {
                const receptionist = await User.findById({ _id: req.query.id, role: 'receptionist' });
                if (receptionist) {
                    return ResponseService.send(res, StatusCodes.OK, "receptionist fetched successfully", 1, receptionist);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch receptionist", 0);
                }
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

}

export default ReceptionistController;
