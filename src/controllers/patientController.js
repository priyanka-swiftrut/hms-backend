import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import billModel from '../models/Bill.model.js';
import Hospital from '../models/Hospital.model.js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import EmailService from '../services/email.service.js';
import cloudinary from '../config/cloudinaryConfig.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import deleteImage from '../services/deleteImagesServices.js';


class PatientController {

    async Register(req, res) {
        try {
            const { body, files } = req;
            const { profilePicture } = files || {};
            const profileImagePath = profilePicture?.[0]?.path;
    
            // Check if the request body is empty
            if (!body || Object.keys(body).length === 0) {
                if (profileImagePath) await deleteImage(profileImagePath, "profileImages");
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
    
            // Check if password and confirm password match
            if (body.password !== body.confirmPassword) {
                if (profileImagePath) await deleteImage(profileImagePath, "profileImages");
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Password and Confirm Password do not match", 0);
            }
    
            // Check if the email already exists
            const existingUser = await User.findOne({ email: body.email });
            if (existingUser) {
                if (profileImagePath) await deleteImage(profileImagePath, "profileImages");
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email already exists", 0);
            }
    
            // Hash the password
            const hashedPassword = await bcrypt.hash(body.password, 10);
    
            // Create the new patient data
            const newPatientData = {
                fullName: `${body.firstName} ${body.lastName}`,
                email: body.email,
                phone: body.phone,
                age: body.age,
                gender: body.gender,
                address: {
                    country: body.country,
                    state: body.state,
                    city: body.city,
                    zipCode: body.zipCode,
                    fullAddress: body.fullAddress,
                },
                role: "patient",
                password: hashedPassword,
                metaData: {
                    patientData: {
                        height: body.height,
                        weight: body.weight,
                        bloodGroup: body.bloodGroup,
                        dob: body.dob,
                        phoneCode: body.phoneCode,
                        termsAccepted: body.termsAccepted,
                    },
                },
                profilePicture: profileImagePath || undefined,
            };
    
            // Create and save the new patient user
            const newPatient = new User(newPatientData);
            await newPatient.save();
    
            // Send registration email
            try {
                const emailHtml = EmailService.registrationTemplate(newPatient.fullName, newPatient.email, body.password);
                await EmailService.sendEmail(newPatient.email, "Registration Successful ✔", emailHtml);
            } catch (emailError) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient registered, but email sending failed", 0);
            }
    
            // Send successful response
            return ResponseService.send(res, StatusCodes.OK, "Patient registered successfully", 1, newPatient);
        } catch (error) {
            // Delete the profile image if any error occurs
            if (profileImagePath) await deleteImage(profileImagePath, "profileImages");
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async EditProfile(req, res) {
        try {
            const { body, files, user } = req;
            const { profilePicture } = files || {};
            const { _id } = user;
    
            // Check if the request body is empty
            if (!body || Object.keys(body).length === 0) {
                if (profilePicture?.[0]?.path) {
                    await deleteImage(profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
    
            const patient = await User.findById(_id);
            if (!patient) {
                if (profilePicture?.[0]?.path) {
                    await deleteImage(profilePicture[0].path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient not found", 0);
            }
    
            // Handle fullName if firstName and lastName are provided
            if (body.firstName && body.lastName) {
                body.fullName = `${body.firstName} ${body.lastName}`;
            }
    
            // Handle profilePicture upload and deletion
            if (profilePicture?.[0]?.path) {
                if (patient.profilePicture) {
                    const publicId = patient.profilePicture.split("/").pop().split(".")[0];
                    await cloudinary.uploader.destroy(`profileImages/${publicId}`);
                }
                body.profilePicture = profilePicture[0].path;
            }
    
            // Restructure address fields
            if (body.country || body.state || body.city || body.zipCode || body.fullAddress) {
                body.address = {
                    country: body.country || patient.address?.country,
                    state: body.state || patient.address?.state,
                    city: body.city || patient.address?.city,
                    zipCode: body.zipCode || patient.address?.zipCode,
                    fullAddress: body.fullAddress || patient.address?.fullAddress,
                };
            }
    
            // Restructure patientData (metaData)
            if (body.height || body.weight || body.bloodGroup || body.dob || body.phoneCode || body.termsAccepted) {
                body.metaData = {
                    ...patient.metaData,
                    patientData: {
                        ...patient.metaData?.patientData,
                        height: body.height || patient.metaData?.patientData?.height,
                        weight: body.weight || patient.metaData?.patientData?.weight,
                        bloodGroup: body.bloodGroup || patient.metaData?.patientData?.bloodGroup,
                        dob: body.dob || patient.metaData?.patientData?.dob,
                        phoneCode: body.phoneCode || patient.metaData?.patientData?.phoneCode,
                        termsAccepted: body.termsAccepted !== undefined ? body.termsAccepted : patient.metaData?.patientData?.termsAccepted,
                    },
                };
            }
    
            // Update the patient document
            const updatedPatient = await User.findByIdAndUpdate(_id, body, { new: true });
            if (updatedPatient) {
                const token = jwt.sign({ userData: updatedPatient }, process.env.JWT_SECRET_PATIENT, { expiresIn: "1d" });
    
                return ResponseService.send(res, StatusCodes.OK, "Patient profile updated successfully", 1, {
                    ...updatedPatient.toObject(),
                    token
                });
            }
    
            // If update fails, delete the uploaded image if any
            if (profilePicture?.[0]?.path) {
                await deleteImage(profilePicture[0].path, "profileImages");
            }
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update patient profile", 0);
        } catch (error) {
            if (profilePicture?.[0]?.path) {
                await deleteImage(profilePicture[0].path, "profileImages");
            }
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
    }

    async deleteProfile(req, res) {
        try {
            const { id } = req.params;
            
            const patient = await User.findById(id);
            if (!patient) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient not found", 0);
            }
    
            if (patient.profilePicture) {
                const publicId = patient.profilePicture.split("/").pop().split(".")[0];
                await cloudinaryConfig.uploader.destroy(`profileImages/${publicId}`);
            }
    
            const updatedPatient = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
            if (updatedPatient) {
                return ResponseService.send(res, StatusCodes.OK, "Patient profile deleted successfully", 1, updatedPatient);
            }
    
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to delete patient profile", 0);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }
    
    async getPatients(req, res) {
        try {
            const { id, search, bloodGroup, age, gender } = req.query;
    
            let query = { role: 'patient', isActive: true };
    
            if (!id) {
                // Add search filter if provided
                if (search) {
                    query.$or = [
                        { fullName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { phone: { $regex: search, $options: 'i' } },
                    ];
                }
    
                // Add filters for bloodGroup, age, and gender if provided
                if (bloodGroup) query['metaData.patientData.bloodGroup'] = bloodGroup;
                if (age) query.age = age;
                if (gender) query.gender = gender;
    
                // Fetch all patients based on the query
                const patients = await User.find(query).select('-password');
                if (patients.length > 0) {
                    const formattedPatients = patients.map(({ _id, fullName, email, phone, gender, age, metaData, address, createdAt }) => ({
                        id: _id,
                        fullName,
                        email,
                        phone,
                        gender,
                        age,
                        bloodGroup: metaData?.patientData?.bloodGroup,
                        address,
                        metaData,
                        createdAt
                    }));
    
                    return ResponseService.send(res, StatusCodes.OK, 'Patients fetched successfully', 1, formattedPatients);
                } else {
                    return ResponseService.send(res, StatusCodes.NOT_FOUND, 'No patients found', 0);
                }
            }
    
            // Fetch a single patient by ID
            const patient = await User.findOne({ _id: id, role: 'patient', isActive: true }).select('-password');
            if (patient) {
                const { _id, fullName, email, phone, gender, age, metaData, address, createdAt } = patient;
                const formattedPatient = {
                    id: _id,
                    fullName,
                    email,
                    phone,
                    gender,
                    age,
                    bloodGroup: metaData?.patientData?.bloodGroup,
                    address,
                    metaData,
                    createdAt
                };
    
                return ResponseService.send(res, StatusCodes.OK, 'Patient fetched successfully', 1, formattedPatient);
            } else {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, 'Patient not found', 0);
            }
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async deleteImage(path) {
        if (path) {
            const publicId = path.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`profileImages/${publicId}`);
        }
    };

    async getBillsforPatient(req, res) {
        try {
            const { id } = req.user;
            const { status } = req.query;
    
            // Validate input
            if (!id) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient ID is required", 0);
            }
    
            // Build the query object
            const query = { patientId: id };
    
            // If a status is provided, validate and add it to the query
            if (status) {
                if (!['paid', 'unpaid'].includes(status)) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid status value", 0);
                }
                query.status = status === "paid"; // True for 'paid', false for 'unpaid'
            }
    
            // Fetch bills based on the query
            const billsData = await billModel.find(query)
                .sort({ createdAt: -1 })
                .populate("hospitalId", "name")
                .populate("patientId", "fullName email phone age gender address");
    
            // Map the data to return in a structured format
            const bills = billsData.map(({ billNumber, _id, status, date, time, totalAmount, hospitalId, patientId }) => ({
                billNumber,
                billId: _id,
                status: status ? "Paid" : "Unpaid",
                date: new Date(date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }),
                time,
                totalAmount,
                hospitalName: hospitalId?.name || "N/A",
                patientName: patientId?.fullName || "N/A",
            }));
    
            // Return the result
            return ResponseService.send(res, StatusCodes.OK, "Bills fetched successfully", 1, bills);
        } catch (error) {
            console.error("Error fetching bills:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }
    
    async getDoctorAndHospital(req, res) {
        try {
            // Fetch all hospital data
            const hospitalData = await Hospital.find();
            if (!hospitalData?.length) {
                return ResponseService.send(
                    res,
                    StatusCodes.NOT_FOUND,
                    "No hospitals found",
                    0,
                    {}
                );
            }
    
            // Fetch all active doctors and populate their hospital information
            const doctorData = await User.find({ role: "doctor", isActive: true })
                .populate("hospitalId", "name worksiteLink address zipcode")
                .select("fullName address hospitalId metaData.doctorData.speciality");
    
            if (!doctorData?.length) {
                return ResponseService.send(
                    res,
                    StatusCodes.NOT_FOUND,
                    "No active doctors found",
                    0,
                    {}
                );
            }
    
            // Transform the doctorData using a map loop
            const transformedDoctorData = doctorData.map(({ _id, fullName, address, hospitalId, metaData }) => ({
                id: _id,
                fullName,
                speciality: metaData?.doctorData?.speciality || "N/A",
                address: {
                    country: address?.country || "N/A",
                    state: address?.state || "N/A",
                    city: address?.city || "N/A",
                    zipCode: address?.zipCode || "N/A",
                    fullAddress: address?.fullAddress || "N/A"
                },
                hospital: {
                    id: hospitalId?._id || null,
                    name: hospitalId?.name || "N/A",
                    address: hospitalId?.address || "N/A",
                    zipcode: hospitalId?.zipcode || "N/A",
                    worksiteLink: hospitalId?.worksiteLink || "N/A"
                }
            }));
    
            // Send the transformed data in the response
            return ResponseService.send(
                res,
                StatusCodes.OK,
                "Doctor and hospital fetched successfully",
                1,
                { doctorData: transformedDoctorData }
            );
        } catch (error) {
            // Handle unexpected errors
            console.error("Error fetching doctor and hospital data:", error);
            return ResponseService.send(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                "An error occurred while fetching data",
                0,
                {}
            );
        }
    }

}

export default PatientController;
