import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import billModel from '../models/Bill.model.js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import EmailService from '../services/email.service.js';


class PatientController {
    async Register(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            if (req.body.password !== req.body.confirmPassword) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Password and Confirm Password do not match", 0);
            }
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                }
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
                const emailHtml = EmailService.registrationTemplate(newPatient.fullName, newPatient.email, req.body.password);
                await EmailService.sendEmail(newPatient.email, "Registration Successful ✔", emailHtml);
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
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            const patient = await User.findById(req.user._id);
            if (!patient) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient not found", 0);
            }
            if (req.files) {
                if (req.files?.profilePicture?.[0]?.path) {
                    if (patient.profilePicture && patient.profilePicture !== "") {
                        const publicId = patient.profilePicture.split("/").pop().split(".")[0];
                        await cloudinary.uploader.destroy(`profileImages/${publicId}`);
                    }
                    req.body.profilePicture = req.files.profilePicture[0].path;
                }
            }
            const updatedPatient = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
            if (updatedPatient) {
                return ResponseService.send(res, StatusCodes.OK, "Patient profile updated successfully", 1, updatedPatient);
            } else {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update patient profile", 0);
            }
        } catch (error) {
            if (req.files?.profilePicture?.[0]?.path) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path);
                }
            }
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
                const patients = await User.find({ role: 'patient', isActive: true });
                if (patients) {
                    return ResponseService.send(res, StatusCodes.OK, "Patients fetched successfully", 1, patients);
                } else {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to fetch Patients", 0);
                }
            }
            else {
                const patient = await User.findById({ _id: req.query.id, role: 'patient', isActive: true });
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

    async deleteImage(path) {
        if (path) {
            const publicId = path.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`profileImages/${publicId}`);
        }
    };

    async getBillsforPatient(req, res) {
        try {
            const { id } = req.user; // Assuming `req.user` contains the authenticated user's details
            const { status } = req.query;
    
            // Validate input
            if (!id) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Patient ID is required", 0);
            }
    
            // Build the query object
            const query = { patientId: id };
    
            // If a status is provided, add it to the query
            if (status) {
                if (status !== "paid" && status !== "unpaid") {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid status value", 0);
                }
                query.status = status === "paid"; // `true` for paid, `false` for unpaid
            }
    
            // Fetch bills based on the query
            const billsData = await billModel.find(query)
                .sort({ createdAt: -1 }) // Optional: Sort by newest first
                .populate("hospitalId", "name")
                .populate("patientId", "fullName email phone age gender address")
            
            // Map the data to return in a structured format
            const bills = billsData.map((bill) => ({
                billNumber: bill.billNumber,
                billId: bill._id,
                status: bill.status ? "Paid" : "Unpaid",
                date: new Date(bill.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }), // Format the date to "2 Jan, 2022"
                time: bill.time,
                totalAmount: bill.totalAmount,
                hospitalName: bill.hospitalId?.name || "N/A",
                patientName: bill.patientId?.fullName || "N/A",
            }));
    
            // Return the result
            return ResponseService.send(res, StatusCodes.OK, "Bills fetched successfully", 1, bills );
        } catch (error) {
            console.error("Error fetching bills:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }
    
    
    
    
    


}

export default PatientController;
