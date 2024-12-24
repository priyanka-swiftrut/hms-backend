import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { StatusCodes } from 'http-status-codes';
import regestration from '../services/emailTemplate.js';

class PatientController {
    async Register(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            if (req.body.password !== req.body.confirmPassword) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Password and Confirm Password do not match", 0);
            }
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email already exists", 0);
            }
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const newPatientData = {
                fullName: `${req.body.firstName} ${req.body.lastName}`,
                email: req.body.email,
                phone: req.body.phone,
                age: req.body.age,
                gender: req.body.gender,
                address: {
                    country: req.body.country,
                    state: req.body.state,
                    city: req.body.city,
                    zipCode: req.body.zipCode,
                    fullAddress: req.body.fullAddress,
                },
                role: "patient",
                password: hashedPassword,
                metaData: {
                    patientData: {
                        height: req.body.height,
                        weight: req.body.weight,
                        bloodGroup: req.body.bloodGroup,
                        dob: req.body.dob,
                    },
                },
            };
            if (req.files?.profilePicture?.[0]?.path) {
                newPatientData.profilePicture = req.files.profilePicture[0].path;
            }
            const newPatient = new User(newPatientData);
            await newPatient.save();
            try {
                const transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.PASSWORD,
                    },
                });
                const htmlMessage = regestration(newPatientData.fullName, req.body.email, req.body.password);
                await transporter.sendMail({
                    from: process.env.EMAIL,
                    to: req.body.email,
                    subject: "Registration Successful ✔",
                    text: `Hello ${newPatientData.fullName}, You've successfully registered as a patient.`,
                    html: htmlMessage,
                });
            } catch (emailError) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient registered, but email sending failed", 0);
            }
            return ResponseService.send(res, StatusCodes.OK, "Patient registered successfully", 1, newPatient);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async EditProfile(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            const patient = await User.findById(req.user._id);
            if (!patient) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient not found", 0);
            }
            if (req.files) {
                if (req.files?.profilePicture?.[0]?.path) {
                    req.body.profilePicture = req.files.profilePicture[0].path;
                }
            }
            const updatedPatient = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
            if (updatedPatient) {
                return ResponseService.send(res, StatusCodes.OK, "Patient profile updated successfully", 1, updatedPatient);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update patient profile", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async deleteProfile(req, res) {
        try {
            const patient = await User.findById(req.params.id);
            if (!patient) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient not found", 0);
            }
            if (patient.profilePicture) {
                const publicId = patient.profilePicture.split("/").pop().split(".")[0];
                await cloudinaryConfig.uploader.destroy(`profileImages/${publicId}`);
            }
            const updatedPatient = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
            if (updatedPatient) {
                return ResponseService.send(res, StatusCodes.OK, "Patient profile deleted successfully", 1, updatedPatient);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to delete patient profile", 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }
    async getPatients(req, res) {
        try {
            if (req.query.id === '' || req.query.id === undefined || req.query.id === null) {
                const patients = await User.find({ role: 'patient' });
                if (patients) {
                    return ResponseService.send(res, StatusCodes.OK, "Patients fetched successfully", 1, patients);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch Patients", 0);
                }
            }
            else {
                const patient = await User.findById({ _id: req.query.id, role: 'patient' });
                if (patient) {
                    return ResponseService.send(res, StatusCodes.OK, "Patient fetched successfully", 1, patient);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch Patient", 0);
                }
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

}

export default PatientController;
