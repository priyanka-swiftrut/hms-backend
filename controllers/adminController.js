import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import EmailService from '../services/email.service.js';
import crypto from 'crypto';

class AdminController {
    
    async Register(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            if (req.body.password !== "" && req.body.password === req.body.confirmPassword) {
                let checkmail = await User.findOne({ email: req.body.email });
                if (checkmail) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email Already Exists", 0);
                } else {
                    let pass = await bcrypt.hash(req.body.password, 10);
                    req.body.password = pass;
                    req.body.role = "admin";
                    req.body.fullName = req.body.firstName + " " + req.body.lastName;
                    if (req.files) {
                        if (req.files?.profilePicture?.[0]?.path) {
                            req.body.profilePicture = req.files.profilePicture[0].path;
                        }
                    }
                    let newUser = new User(req.body);
                    await newUser.save();
                    if (newUser) {
                        try {
                            const emailHtml = EmailService.registrationTemplate(newUser.fullName, newUser.email, req.body.password);
                            await EmailService.sendEmail(newUser.email, "Registration Successful ✔", emailHtml);
                        } catch (emailError) {
                            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User registered, but email sending failed", 0);
                        }
                        return ResponseService.send(res, StatusCodes.OK, "Admin Registered Successfully", 1, newUser);
                    } else {
                        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Something went wrong", 0);
                    }
                }
            } else {
                return ResponseService.send(res, 400, "Password and Confirm Password is Not Matched", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async EditProfile(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            let user = await User.findById(req.user._id);
            if (user) {
                if (req.files) {
                    if (req.files?.profilePicture?.[0]?.path) {
                        if (user.profilePicture) {
                            const publicId = user.profilePicture.split("/").pop().split(".")[0];
                            await cloudinaryConfig.uploader.destroy(`profileImages/${publicId}`);
                        }
                        req.body.profilePicture = req.files.profilePicture[0].path;
                    }
                }
                req.body.fullName = req.body.firstName + " " + req.body.lastName;
                let updatedUser = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
                if (updatedUser) {
                    return ResponseService.send(res, StatusCodes.OK, "Profile Updated Successfully", 1, updatedUser);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to Update Profile", 0);
                }
            }
            else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User Not Found", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
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
                    return ResponseService.send(res, StatusCodes.OK, "Profile Deleted Successfully", 1, deletedUser);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to Delete Profile", 0);
                }
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User Not Found", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async createDoctor(req, res) {
        try {
            if (!req.user || req.user.role !== "admin") {
                return ResponseService.send(res, StatusCodes.FORBIDDEN, "Access denied. Admin only.", 0);
            }
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email already exists", 0);
            }
            const hospitalId = req.user.hospitalId;
            if (!hospitalId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Hospital ID is required", 0);
            }
            const password = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await bcrypt.hash(password, 10);
            const newDoctor = {
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
                role: "doctor",
                password: hashedPassword,
                metaData: {
                    doctorData: {
                        qualification: req.body.qualification,
                        speciality: req.body.speciality,
                        morningSession: req.body.morningSession,
                        eveningSession: req.body.eveningSession,
                        duration: req.body.duration,
                        experience: req.body.experience,
                        description: req.body.description,
                        onlineConsultationRate: req.body.onlineConsultationRate,
                        worksiteLink: req.body.worksiteLink,
                        emergencyContactNo: req.body.emergencyContactNo,
                    }
                }
            }
            if (req.files) {
                if (req.files?.profilePicture?.[0]?.path) {
                    newDoctor.profilePicture = req.files.profilePicture[0].path;
                }
                if (req.files?.signature?.[0]?.path) {
                    newDoctor.metaData.doctorData.signature = req.files.signature[0].path;
                }
            }
            const doctor = new User(newDoctor);
            await doctor.save();
            if (doctor) {
                try {
                    const emailHtml = EmailService.registrationTemplate(doctor.fullName, doctor.email, password);
                    await EmailService.sendEmail(doctor.email, "Doctor Registration Successful ✔", emailHtml);
                } catch (emailError) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor registered, but email sending failed", 0);
                }
                return ResponseService.send(res, StatusCodes.OK, "Doctor Registered Successfully", 1, doctor);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Something went wrong", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async deleteDoctor(req, res) {
        try {
            const doctor = await User.findById(req.params.id);
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found", 0);
            }
            const updateDoctor = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
            if (updateDoctor) {
                return ResponseService.send(res, StatusCodes.OK, "Doctor profile deleted successfully", 1, updateDoctor);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to delete Doctor profile", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }
}
export default AdminController;