import User from '../models/User.model.js';
import sendResponse from '../services/response.services.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { StatusCodes } from 'http-status-codes';
import regestration from '../services/emailTemplate.js';

class ReceptionistController {
    async registerReceptionist(req , res) {
        try {
            // Check if request body is empty
            if (!req.body || Object.keys(req.body).length === 0) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            // Ensure the logged-in user is an admin
            if (!req.user || req.user.role !== "admin") {
                return sendResponse(res, StatusCodes.FORBIDDEN, "Access denied. Admin only.", 0);
            }

            // Ensure hospitalId exists in req.user
            const hospitalId = req.user.hospitalId;
            if (!hospitalId) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Hospital ID is required", 0);
            }

            // Password validation
            if (password !== confirmPassword) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Password and Confirm Password do not match", 0);
            }

            // Check if email already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Email already exists", 0);
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Process profile picture
            let profilePicture = "https://vectorified.com/images/default-user-icon-33.jpg"; // Default profile picture
            if (req.files?.profilePicture?.[0]?.path) {
                profilePicture = req.files.profilePicture[0].path;
            }

            // Prepare the receptionist data
            const receptionistData = {
                fullName: `${firstName} ${lastName}`,
                email,
                phone,
                age,
                gender,
                profilePicture,
                address: {
                    country,
                    state,
                    city,
                    zipCode,
                    fullAddress,
                },
                role: "receptionist",
                password: hashedPassword,
                hospitalId,
                metaData: {
                    receptionistData: {
                        qualification,
                        emergencyContactNo,
                        workingTime,
                        breakTime,
                    },
                },
            };

            // Save the new receptionist
            const newReceptionist = new User(receptionistData);
            await newReceptionist.save();

            // Send registration email
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
                const htmlMessage = registrationTemplate(`${firstName} ${lastName}`, email, password);
                await transporter.sendMail({
                    from: process.env.EMAIL,
                    to: email,
                    subject: "Receptionist Registration Successful ✔",
                    text: `Hello ${firstName} ${lastName}, You've successfully registered as a receptionist.`,
                    html: htmlMessage,
                });
            } catch (emailError) {
                return sendResponse(
                    res,
                    StatusCodes.BAD_REQUEST,
                    "Receptionist registered, but email sending failed",
                    0
                );
            }

            // Respond with success
            return sendResponse(res, StatusCodes.OK, "Receptionist registered successfully", 1, newReceptionist);
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
    }

    async EditProfile(req, res) {   
        try {
            console.log(req.user, "req.user");
            
            // Check if request body is empty
            if (!req.body || Object.keys(req.body).length === 0) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            // Find the patient by id
            const receptionist = await User.findById(req.user._id);
            if (!receptionist) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "receptionist not found", 0);
            }

            // Check if profile picture is present
            if (req.files) {
                if (req.files?.profilePicture?.[0]?.path) {
                    req.body.profilePicture = req.files.profilePicture[0].path;
                }
            }

            // Update the patient
            const updatereceptionist = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
            if (updatereceptionist) {
                return sendResponse(res, StatusCodes.OK, "receptionist profile updated successfully", 1, updatereceptionist);
            } else {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to update receptionist profile", 0);
            }
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }   

    async deleteProfile(req, res) {
        try {
            // Find the receptionist by id
            const receptionist = await User.findById(req.params.id);
            if (!receptionist) {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "receptionist not found", 0);
            }

            // Delete the receptionist profile picture
            if (receptionist.profilePicture) {
                const publicId = receptionist.profilePicture.split("/").pop().split(".")[0];
                await cloudinaryConfig.uploader.destroy(`profileImages/${publicId}`);
            }

            // Update the receptionist
            const updatereceptionist = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
            if (updatereceptionist) {
                return sendResponse(res, StatusCodes.OK, "receptionist profile deleted successfully", 1, updatereceptionist);
            } else {
                return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to delete receptionist profile", 0);
            }
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }    
    async getPatients(req, res) {
        try {
            if (req.query.id === '' || req.query.id === undefined || req.query.id === null) {
                const patients = await User.find({ role: 'patient' });
                if (patients) {
                    return sendResponse(res, StatusCodes.OK, "Patients fetched successfully", 1, patients);
                } else {
                    return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to fetch Patients", 0);
                }
            }
            else {
                const patient = await User.findById({ _id: req.query.id, role: 'patient' });
                if (patient) {
                    return sendResponse(res, StatusCodes.OK, "Patient fetched successfully", 1, patient);
                } else {
                    return sendResponse(res, StatusCodes.BAD_REQUEST, "Failed to fetch Patient", 0);
                }
            }
        } catch (error) {
            return sendResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

}

export default PatientController;
