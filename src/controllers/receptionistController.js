import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import mongoose from 'mongoose';
import appointmentModel from '../models/Appointment.model.js';
import PrescriptionModel from '../models/priscription.model.js'
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import cloudinary from '../config/cloudinaryConfig.js';
import crypto from 'crypto';
import EmailService from '../services/email.service.js';
import jwt from 'jsonwebtoken';
import deleteImage from '../services/deleteImagesServices.js';


class ReceptionistController {

    async Register(req, res) {
        try {
            // Check if the user is an admin (access control)
            if (!req.user || req.user.role !== "admin") {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files.profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.FORBIDDEN, "Access denied. Admin only.", 0);
            }
    
            // Check if request body is empty
            if (!req.body || Object.keys(req.body).length === 0) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files.profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
    
            const hospitalId = req.user.hospitalId;
    
            // Ensure hospital ID is provided
            if (!hospitalId) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files.profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Hospital ID is required", 0);
            }
    
            // Check if the email already exists
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files.profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email already exists", 0);
            }
    
            const password = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await bcrypt.hash(password, 10);
    
            // Prepare the new receptionist data
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
    
            // Add profile picture path if available
            if (req.files?.profilePicture?.[0]?.path) {
                newReceptionistData.profilePicture = req.files.profilePicture[0].path;
            }
    
            // Create the new receptionist
            const newReceptionist = new User(newReceptionistData);
            await newReceptionist.save();
    
            try {
                const emailHtml = EmailService.registrationTemplate(newReceptionist.fullName, newReceptionist.email, password);
                await EmailService.sendEmail(newReceptionist.email, "Registration Successful ✔", emailHtml);
            } catch (emailError) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files.profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Receptionist registered, but email sending failed", 0);
            }
    
            return ResponseService.send(res, StatusCodes.OK, "Receptionist registered successfully", 1, newReceptionist);
        } catch (error) {
            // Handle error and clean up any uploaded images if they exist
            if (req.files?.profilePicture?.[0]?.path) {
                await deleteImage(req.files.profilePicture[0].path, "profileImages");
            }
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async EditProfile(req, res) {
        try {
            // Validate request body
            if (!req.body || Object.keys(req.body).length === 0) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files.profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
    
            // Determine user ID based on role
            const userId = req.user.role === "admin" ? req.params.id : req.user._id;
    
            // Find the receptionist by ID
            const receptionist = await User.findById(userId);
            if (!receptionist) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files.profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Receptionist not found", 0);
            }
    
            // Update fullName if firstName and lastName are provided
            if (req.body.firstName && req.body.lastName) {
                req.body.fullName = `${req.body.firstName} ${req.body.lastName}`;
            }
    
            // Handle profile picture update
            if (req.files?.profilePicture?.[0]?.path) {
                // Delete old profile picture if exists
                if (receptionist.profilePicture) {
                    const publicId = receptionist.profilePicture.split("/").pop().split(".")[0];
                    await cloudinary.uploader.destroy(`profileImages/${publicId}`);
                }
                req.body.profilePicture = req.files.profilePicture[0].path;
            }
    
            // Restructure address fields
            const { country, state, city, zipCode, fullAddress } = req.body;
            if (country || state || city || zipCode || fullAddress) {
                req.body.address = {
                    country: country || receptionist.address?.country,
                    state: state || receptionist.address?.state,
                    city: city || receptionist.address?.city,
                    zipCode: zipCode || receptionist.address?.zipCode,
                    fullAddress: fullAddress || receptionist.address?.fullAddress,
                };
            }
    
            // Update the receptionist profile
            const updatedReceptionist = await User.findByIdAndUpdate(userId, req.body, { new: true });
    
            if (updatedReceptionist) {
                // Generate a new token
                const token = jwt.sign({ userData: updatedReceptionist }, process.env.JWT_SECRET_RECEPTIONIST, { expiresIn: "1d" });
    
                // Prepare response payload
                const responseData = {
                    ...updatedReceptionist._doc,
                    token,
                };
    
                return ResponseService.send(res, StatusCodes.OK, "Receptionist profile updated successfully", 1, responseData);
            } else {
                if (req.files?.profilePicture?.[0]?.path) {
                    await deleteImage(req.files.profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update receptionist profile", 0);
            }
        } catch (error) {
            if (req.files?.profilePicture?.[0]?.path) {
                await deleteImage(req.files.profilePicture[0].path, "profileImages");
            }
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
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
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
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
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async getPatient(req, res) {
        try {
            // Find a patient with the role "patient" and select specific fields
            const patient = await User.find({ role: 'patient' }).select('fullName _id number');
    
            // Check if no patient is found
            if (!patient || patient.length === 0) {
                return ResponseService.send(
                    res,
                    StatusCodes.NOT_FOUND,
                    {
                        message: 'Patient not found',
                        data: [],
                        count: 0,
                    },
                    0
                );
            }
    
            // Return patient details directly in the "data" field
            return ResponseService.send(
                res,
                StatusCodes.OK,
                {
                    message: 'Patient detail for appointment booking',
                    data: patient,
                    count: 1,
                }
            );
        } catch (error) {
            // Handle server errors
            return ResponseService.send(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                {
                    message: 'Internal Server Error',
                    error: error.message, // Provide additional error details for debugging
                }
            );
        }
    }
    

    async getpatientdetailforreception(req, res) {
        try {
            const { hospitalId } = req.user; // Assuming hospitalId is passed from req.user
            const { search } = req.query; // Query parameter to search by patient name
    
            if (!hospitalId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, 'Hospital ID is required', 0);
            }
    
            // Fetch patients directly from the User model
            let query = {
                role: 'patient',
                isActive: true,
            };
    
            // Add search condition if provided
            if (search) {
                query.fullName = { $regex: `^${search}`, $options: 'i' }; // Case-insensitive search for patient names
            }
    
            // Fetch patients and sort them by latest (e.g., based on `createdAt`)
            const patients = await User.find(query).sort({ createdAt: -1 });
    
            // Map the results to the desired format
            const response = patients.map(({ _id: patientId, fullName: patientName, email: patientEmail, phone: patientNumber, gender: patientGender, age: patientAge }) => ({
                patientId,
                patientName,
                patientEmail,
                patientNumber,
                patientGender,
                patientAge,
            }));
    
            if (response.length > 0) {
                return ResponseService.send(
                    res,
                    StatusCodes.OK,
                    'Unique patients fetched successfully',
                    1,
                    response
                );
            } else {
                return ResponseService.send(res, StatusCodes.OK, 'No patients found', 1, []);
            }
        } catch (error) {
            return ResponseService.send(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                error.message,
                'error'
            );
        }
    }
    
    async patientdeshboardforreceptionist(req, res) {
        try {
            const { patientId: queryPatientId } = req.query; // Get patientId from query
            const isReceptionist = req.user.role === 'receptionist';
            
            // Determine the patientId to fetch data for
            const patientId = isReceptionist ? queryPatientId : req.user._id;
    
            if (!patientId) {
                return ResponseService.send(
                    res,
                    StatusCodes.BAD_REQUEST,
                    'Patient ID is required.',
                    'error'
                );
            }
    
            // Fetch patient profile
            const patientProfile = await User.findById(patientId);
            if (!patientProfile) {
                return ResponseService.send(
                    res,
                    StatusCodes.NOT_FOUND,
                    'Patient profile not found',
                    'error'
                );
            }
    
            // Fetch prescriptions and populate hospital details
            const prescriptionsData = await PrescriptionModel.find({ patientId })
                .sort({ createdAt: -1 })
                .populate('patientId', 'fullName gender address age phone')
                .populate('doctorId', 'fullName metaData.doctorData.speciality metaData.doctorData.signature')
                .populate('appointmentId', 'dieseas_name type appointmentTime date')
                .populate('hospitalId', 'name');
    
            // Map prescription data to desired structure
            const prescriptions = prescriptionsData.map(({
                _id: prescriptionId,
                date,
                hospitalId,
                appointmentId,
                doctorId,
                patientId,
                medications = 'N/A',
                instructions: additionalNote,
                ...rest
            }) => {
                const addressObj = patientId?.address;
                const formattedAddress = addressObj
                    ? `${addressObj.fullAddress || 'N/A'}, ${addressObj.city || 'N/A'}, ${addressObj.state || 'N/A'}, ${addressObj.country || 'N/A'}, ${addressObj.zipCode || 'N/A'}`
                    : 'N/A';
    
                return {
                    prescriptionId,
                    prescriptionDate: new Date(date).toLocaleDateString('en-GB'),
                    hospitalName: hospitalId?.name || 'N/A',
                    DiseaseName: appointmentId?.dieseas_name || 'N/A',
                    DoctorName: doctorId?.fullName || 'N/A',
                    patientName: patientId?.fullName || 'N/A',
                    patientNumber: patientId?.phone || 'N/A',
                    doctorspecialty: doctorId?.metaData?.doctorData?.speciality || 'N/A',
                    gender: patientId?.gender || 'N/A',
                    age: patientId?.age || 'N/A',
                    address: formattedAddress,
                    medications,
                    additionalNote,
                    doctorsignature: doctorId?.metaData?.doctorData?.signature || 'N/A',
                    appointmentTime: appointmentId?.appointmentTime || 'N/A',
                    appointmentDate: appointmentId?.date || 'N/A',
                    dieseas_name: appointmentId?.dieseas_name || 'N/A',
                };
            });
    
            // Prepare dashboard data
            const dashboardData = { patientProfile, prescriptions };
    
            // Return success response with dashboard data
            return ResponseService.send(res, StatusCodes.OK, 'Dashboard data fetched successfully', 'success', dashboardData);
        } catch (error) {
            console.error('Error fetching patient dashboard data:', error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, 'An error occurred while fetching patient dashboard data', 0);
        }
    }

    async searchDoctor(req, res) {
        try {
            const { speciality } = req.query;  
            const { hospitalId } = req.user;  
    
            // Prepare the query to fetch doctors from the specific hospital
            const query = {
                role: 'doctor',
                hospitalId,
            };
    
            // If a speciality is provided in the query, filter by that as well
            if (speciality) {
                query['metaData.doctorData.speciality'] = speciality;
            }
    
            // Fetch doctors from the database based on the query
            const doctors = await User.find(query)
                .select('fullName role metaData.doctorData.speciality _id')  
                .lean();  
            // Modify the doctor data to directly include speciality (flattened)
            const doctorList = doctors.map(({ _id, fullName, role, metaData }) => ({
                doctorId: _id,
                fullName,
                role,
                speciality: metaData.doctorData.speciality,  
            }));
    
            // Fetch all specialties for the hospital (doctors' specialties only)
            const specialties = await User.distinct('metaData.doctorData.speciality', {
                role: 'doctor',
                hospitalId,
            });
    
            // Send response with the list of specialties and doctors
            return ResponseService.send(res, StatusCodes.OK, {
                specialties,  
                doctors: doctorList,  // Flattened doctor data
            }, 0);
        } catch (error) {
            console.error(error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error', 0);
        }
    }
    

}

export default ReceptionistController;
