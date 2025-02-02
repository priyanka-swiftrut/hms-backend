import User from '../models/User.model.js';
import AppointmentModel from "../models/Appointment.model.js";
import BillModel from "../models/Bill.model.js";
import PrescriptionModel from "../models/priscription.model.js";
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import EmailService from '../services/email.service.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import deleteImage from '../services/deleteImagesServices.js';
import { type } from 'os';

class AdminController {

    async Register(req, res) {
        try {
            const { body, files } = req;
            const { profilePicture } = files || {};
            const profileImagePath = profilePicture?.[0]?.path;

            if (!body || Object.keys(body).length === 0) {
                if (profileImagePath) {
                    await deleteImage(profileImagePath, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            const { email, password, confirmPassword, firstName, lastName } = body;

            if (password && password === confirmPassword) {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    if (profileImagePath) {
                        await deleteImage(profileImagePath, "profileImages");
                    }
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email Already Exists", 0);
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const fullName = `${firstName} ${lastName}`;
                const userPayload = {
                    ...body,
                    password: hashedPassword,
                    role: "admin",
                    fullName,
                    profilePicture: profileImagePath || undefined,
                };

                const newUser = new User(userPayload);
                await newUser.save();

                if (newUser) {
                    try {
                        const emailHtml = EmailService.registrationTemplate(fullName, email, password);
                        await EmailService.sendEmail(email, "Registration Successful ✔", emailHtml);
                        return ResponseService.send(res, StatusCodes.OK, "Admin Registered Successfully", 1, newUser);
                    } catch (emailError) {
                        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User registered, but email sending failed", 0);
                    }
                } else {
                    if (profileImagePath) {
                        await deleteImage(profileImagePath, "profileImages");
                    }
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Something went wrong", 0);
                }
            } else {
                if (profileImagePath) {
                    await deleteImage(profileImagePath, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Password and Confirm Password do not match", 0);
            }
        } catch (error) {
            const profileImagePath = req.files?.profilePicture?.[0]?.path;
            if (profileImagePath) {
                await deleteImage(profileImagePath, "profileImages");
            }
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async EditProfile(req, res) {
        try {
            // Check if the request body is empty
            if (!req.body || Object.keys(req.body).length === 0) {
                const profilePicturePath = req.files?.profilePicture?.[0]?.path;
                if (profilePicturePath) {
                    await deleteImage(profilePicturePath, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            const user = await User.findById(req.user._id);
            if (!user) {
                const profilePicturePath = req.files?.profilePicture?.[0]?.path;
                if (profilePicturePath) {
                    await deleteImage(profilePicturePath, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User Not Found", 0);
            }

            // Handle profile picture upload
            const profilePicturePath = req.files?.profilePicture?.[0]?.path;
            if (profilePicturePath) {
                await deleteImage(profilePicturePath, "profileImages");
                req.body.profilePicture = profilePicturePath;
            }

            // Set full name if first and last names are provided
            const { firstName, lastName } = req.body;
            if (firstName && lastName) {
                req.body.fullName = `${firstName} ${lastName}`;
            }

            // Update user profile
            const updatedUser = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });

            if (!updatedUser) {
                if (profilePicturePath) {
                    await deleteImage(profilePicturePath, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to Update Profile", 0);
            }

            // Generate JWT token
            const token = jwt.sign({ userData: updatedUser }, process.env.JWT_SECRET_ADMIN, { expiresIn: "1d" });

            const responseData = {
                ...updatedUser._doc,
                token,
            };

            return ResponseService.send(res, StatusCodes.OK, "Profile Updated Successfully", 1, responseData);
        } catch (error) {
            const profilePicturePath = req.files?.profilePicture?.[0]?.path;
            if (profilePicturePath) {
                await deleteImage(profilePicturePath, "profileImages");
            }
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async getAdmin(req, res) {
        try {
            const user = await User.findById(req.user?._id);
            if (user) {
                return ResponseService.send(res, StatusCodes.OK, "Admin fetched successfully", 1, user);
            }
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Admin not found", 0, []);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async deleteProfile(req, res) {
        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User Not Found", 0, []);
            }

            req.body.isActive = false;

            const deletedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

            if (!deletedUser) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to Delete Profile", 0);
            }

            return ResponseService.send(res, StatusCodes.OK, "Profile Deleted Successfully", 1, deletedUser);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async createDoctor(req, res) {
        try {
            const { user, files, body } = req;
            const {
                email,
                firstName,
                lastName,
                phone,
                age,
                gender,
                workon,
                country,
                state,
                city,
                zipCode,
                fullAddress,
                qualification,
                speciality,
                morningSession,
                eveningSession,
                duration,
                experience,
                description,
                onlineConsultationRate,
                worksiteLink,
                consultationRate,
                emergencyContactNo,
                workOn,
                hospitalName,
                hospitalAddress
            } = body;
            

            
            // Check if the user is admin
            if (!user || user.role !== "admin") {
                await deleteImage(files?.profilePicture?.[0]?.path, "profileImages");
                await deleteImage(files?.signature?.[0]?.path, "signatureImages");
                return ResponseService.send(res, StatusCodes.FORBIDDEN, "Access denied. Admin only.", 0);
            }
    
            // Check if signature file is provided
            if (!files?.signature?.[0]?.path) {
                await deleteImage(files?.profilePicture?.[0]?.path, "profileImages");
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Signature file is required", 0);
            }
    
            // Validate experience and age

            if (Number(experience) > Number(age)) {
                await deleteImage(files?.profilePicture?.[0]?.path, "profileImages");
                await deleteImage(files?.signature?.[0]?.path, "signatureImages");
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, `Experience (${experience}) cannot be greater than age (${age})`, 0);
            }
    
            // Generate a random password and hash it
            const password = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await bcrypt.hash(password, 10);
    
            // Prepare doctorData object dynamically
            const doctorData = {
                qualification,
                speciality,
                morningSession,
                eveningSession,
                duration,
                experience,
                description,
                onlineConsultationRate,
                worksiteLink,
                workOn,
                consultationRate,
                signature: files?.signature?.[0]?.path,
            };
    
            // Add optional fields if they are provided
            if (emergencyContactNo) doctorData.emergencyContactNo = emergencyContactNo;
            if (hospitalName) doctorData.hospitalName = hospitalName;
            if (hospitalAddress) doctorData.hospitalAddress = hospitalAddress;
    
            // Create a new doctor object
            const newDoctor = {
                fullName: `${firstName} ${lastName}`,
                email,
                phone,
                age,
                gender,
                hospitalId: user.hospitalId,
                workon,
                address: { country, state, city, zipCode, fullAddress },
                role: "doctor",
                password: hashedPassword,
                metaData: { doctorData },
                profilePicture: files?.profilePicture?.[0]?.path,
            };
    
            // Save the doctor to the database
            const doctor = new User(newDoctor);
            await doctor.save();
    
            // Send a registration email
            const emailHtml = EmailService.registrationTemplate(doctor.fullName, doctor.email, password);
            await EmailService.sendEmail(doctor.email, "Doctor Registration Successful ✔", emailHtml);
    
            return ResponseService.send(res, StatusCodes.OK, "Doctor Registered Successfully", 1, doctor);
        } catch (error) {
            // Handle errors and clean up
            await deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
            await deleteImage(req.files?.signature?.[0]?.path, "signatureImages");
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
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
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async searchData(req, res) {
        try {
            const { query, role } = req.query;

            if (!query) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Query parameter is required", 0);
            }

            const defaultRoles = ['doctor', 'patient', 'receptionist'];

            const searchCriteria = {
                fullName: { $regex: `^${query}`, $options: 'i' }
            };

            if (role) {
                searchCriteria.role = role;
            } else {
                searchCriteria.role = { $in: defaultRoles };
            }

            if (req.user.role !== 'patient') {
                searchCriteria.hospitalId = req.user.hospitalId;
            }

            let results = [];

            if (role === 'patient') {
                const appointments = await AppointmentModel.find()
                    .populate('patientId');

                const patientsFromAppointments = appointments.map(appointment => appointment.patientId);
                results = patientsFromAppointments.filter(patient =>
                    patient.fullName && patient.fullName.toLowerCase().startsWith(query.toLowerCase())
                );
            } else {
                results = await User.find(searchCriteria);

                if (req.user.role === 'patient') {
                    results = results.filter(user => user.role === 'doctor');
                }
            }

            const data = results.filter((value, index, self) =>
                index === self.findIndex((t) => (
                    t._id.toString() === value._id.toString()
                ))
            );

            if (data.length === 0) {
                return ResponseService.send(res, StatusCodes.METHOD_NOT_ALLOWED, "No results found", 0, []);
            }

            return ResponseService.send(res, StatusCodes.OK, "Success", 1, data);
        } catch (error) {
            console.error("Error in searchData:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred", 0);
        }
    }

    async getDashboardData(req, res) {
        try {
            const { hospitalId } = req.user;

            const doctorFilter = { role: "doctor", isActive: true };
            if (hospitalId) doctorFilter.hospitalId = hospitalId;
            const totalDoctors = await User.countDocuments(doctorFilter);

            const appointmentFilter = {};
            if (hospitalId) appointmentFilter.hospitalId = hospitalId;

            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));
            appointmentFilter.date = { $gte: startOfDay, $lte: endOfDay };

            const uniquePatientIds = await AppointmentModel.distinct("patientId");
            const totalPatients = uniquePatientIds.length;

            const last10Days = new Date(now.setDate(now.getDate() - 10));

            const newPatients = await User.countDocuments({
                _id: { $in: uniquePatientIds },
                isActive: true,
                createdAt: { $gte: last10Days },
            });

            const oldPatients = await User.countDocuments({
                _id: { $in: uniquePatientIds },
                isActive: true,
                createdAt: { $lt: last10Days },
            });

            const patientSummary = {
                newPatients,
                oldPatients,
                totalPatients,
            };

            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

            const patientStats = {
                year: await User.countDocuments({
                    _id: { $in: uniquePatientIds },
                    isActive: true,
                    createdAt: { $gte: startOfYear },
                }),
                month: await User.countDocuments({
                    _id: { $in: uniquePatientIds },
                    isActive: true,
                    createdAt: { $gte: startOfMonth },
                }),
                week: await User.countDocuments({
                    _id: { $in: uniquePatientIds },
                    isActive: true,
                    createdAt: { $gte: startOfWeek },
                }),
            };

            const { page = 1 } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;

            const appointments = await AppointmentModel.find(appointmentFilter)
                .populate("patientId", "fullName")
                .populate("doctorId", "fullName")
                .select("type dieseas_name appointmentTime")
                .skip(skip)
                .limit(limit);

            const dashboardData = {
                totalDoctors,
                patientSummary,
                patientStats,
                appointments,
            };

            return ResponseService.send(res, StatusCodes.OK, "Dashboard data retrieved successfully", 1, dashboardData);
        } catch (error) {
            console.error("Error in getDashboardData:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred", 0, []);
        }
    }

    async getPaginatedAppointments(req, res) {
        try {
            const { page = 1 } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;

            const appointments = await AppointmentModel.find()
                .populate("patientId", "fullName")
                .populate("doctorId", "fullName")
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .select("type dieseas_name appointmentTime patientId doctorId");

            const formattedAppointments = appointments.map((appointment) => ({
                patientName: appointment.patientId?.fullName || "Unknown",
                appointmentType: appointment.type,
                doctorName: appointment.doctorId?.fullName || "Unknown",
                diseaseName: appointment.dieseas_name || "N/A",
                appointmentTime: appointment.appointmentTime,
            }));

            return ResponseService.send(res, StatusCodes.OK, "Appointments retrieved successfully", 1, formattedAppointments);
        } catch (error) {
            console.error("Error in getPaginatedAppointments:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred", 0);
        }
    }

    async getBillsmonitoring(req, res) {
        try {
            const { hospitalId } = req.user;
            const { type } = req.query;

            if (!hospitalId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Hospital ID is required", 0, []);
            }

            let bills = [];
            if (type) {
                bills = await BillModel.find({ hospitalId, paymentType: type })
                    .populate("doctorId", "fullName")
                    .populate("patientId", "fullName")
                    .populate("appointmentId", "dieseas_name")
                    .populate("insuranceId", "insuranceCompany insurancePlan")
                    .select("billNumber date id")
                    .lean();

                bills = bills.map((bill) => ({
                    billNumber: bill.billNumber,
                    doctorName: bill.doctorId?.fullName || "N/A",
                    patientName: bill.patientId?.fullName || "N/A",
                    diseaseName: bill.appointmentId?.dieseas_name || "N/A",
                    insuranceCompany: bill.insuranceId?.insuranceCompany || "N/A",
                    insurancePlan: bill.insuranceId?.insurancePlan || "N/A",
                    date: bill.date,
                }));

            } else {
                bills = await BillModel.find({ hospitalId })
                    .populate("patientId", "fullName phone")
                    .populate("appointmentId", "dieseas_name")
                    .select("billNumber paymentStatus date time")
                    .lean();

                bills = bills.map((bill) => ({
                    billNumber: bill.billNumber,
                    patientName: bill.patientId?.fullName || "N/A",
                    diseaseName: bill.appointmentId?.dieseas_name || "N/A",
                    phoneNumber: bill.patientId?.phone || "N/A",
                    status: bill.paymentStatus,
                    date: bill.date,
                    time: bill.time,
                }));
            }
            return ResponseService.send(res, StatusCodes.OK, "Bills retrieved successfully", 1, bills);
        } catch (error) {
            console.error("Error fetching bills:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred", 0);
        }
    }

    async getDashboardDatademo(req, res) {
        try {
            if (req.user.role === "admin" || req.user.role === "receptionist") {
                const { hospitalId } = req.user;


                const doctorFilter = { role: "doctor", isActive: true };
                if (hospitalId) doctorFilter.hospitalId = hospitalId;
                const totalDoctors = await User.countDocuments(doctorFilter);

                const appointmentFilter = {};
                if (hospitalId) appointmentFilter.hospitalId = hospitalId;

                const billfilter = await BillModel.find({ hospitalId })
                    .populate("appointmentId", "dieseas_name")
                    .populate("patientId", "fullName")
                    .select("billNumber status date time patientId appointmentId")
                    .lean();

                const billdata = billfilter.map((bill) => ({
                    "billsNo": bill.billNumber,
                    "patientName": bill.patientId?.fullName || "Unknown",
                    "diseaseName": bill.appointmentId?.dieseas_name || "Unknown",
                    "status": bill.status ? "Paid" : "Unpaid",
                }));

                const UnpaindBills = billfilter.filter((bill) => !bill.status).length;

                const now = new Date();
                const startOfDay = new Date(now.setHours(0, 0, 0, 0));
                const endOfDay = new Date(now.setHours(23, 59, 59, 999));

                appointmentFilter.date = { $gte: startOfDay, $lte: endOfDay };

                const uniquePatientIds = await AppointmentModel.distinct("patientId");

                const totalPatients = uniquePatientIds.length;

                const last10Days = new Date(now.setDate(now.getDate() - 10));

                const newPatients = await User.countDocuments({
                    _id: { $in: uniquePatientIds },
                    isActive: true,
                    createdAt: { $gte: last10Days },
                });

                const oldPatients = await User.countDocuments({
                    _id: { $in: uniquePatientIds },
                    isActive: true,
                    createdAt: { $lt: last10Days },
                });

                const patientSummary = {
                    newPatients,
                    oldPatients,
                    totalPatients,
                };

                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());

                const getPatientChartData = async (uniquePatientIds, startDate, type) => {
                    const data = [];
                    const categories = [];

                    if (type === "year") {
                        for (let i = 0; i < 12; i++) {
                            const monthStart = new Date(startDate.getFullYear(), i, 1);
                            const monthEnd = new Date(startDate.getFullYear(), i + 1, 0);
                            categories.push(monthStart.toLocaleString('default', { month: 'short' }));
                            data.push(
                                await User.countDocuments({
                                    _id: { $in: uniquePatientIds },
                                    isActive: true,
                                    createdAt: { $gte: monthStart, $lt: monthEnd },
                                })
                            );
                        }
                    } else if (type === "month") {
                        const weeksInMonth = 4;
                        for (let i = 0; i < weeksInMonth; i++) {
                            const weekStart = new Date(startDate.getFullYear(), startDate.getMonth(), i * 7 + 1);
                            const weekEnd = new Date(startDate.getFullYear(), startDate.getMonth(), (i + 1) * 7);
                            categories.push(`Week ${i + 1}`);
                            data.push(
                                await User.countDocuments({
                                    _id: { $in: uniquePatientIds },
                                    isActive: true,
                                    createdAt: { $gte: weekStart, $lt: weekEnd },
                                })
                            );
                        }
                    } else if (type === "week") {
                        for (let i = 0; i < 7; i++) {
                            const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
                            const dayEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i + 1);
                            categories.push(dayStart.toLocaleString('default', { weekday: 'short' }));
                            data.push(
                                await User.countDocuments({
                                    _id: { $in: uniquePatientIds },
                                    isActive: true,
                                    createdAt: { $gte: dayStart, $lt: dayEnd },
                                })
                            );
                        }
                    }
                    return { categories, data };
                };
                const patientStats = {
                    year: await getPatientChartData(uniquePatientIds, startOfYear, "year"),
                    month: await getPatientChartData(uniquePatientIds, startOfMonth, "month"),
                    week: await getPatientChartData(uniquePatientIds, startOfWeek, "week"),
                };
                const { page = 1 } = req.query;
                const limit = 10;
                const skip = (page - 1) * limit;

                const appointments = await AppointmentModel.find(appointmentFilter)
                    .populate("patientId", "fullName")
                    .populate("doctorId", "fullName")
                    .select("type dieseas_name appointmentTime ")
                    .skip(skip)
                    .limit(limit);

                const todayAppointments = await AppointmentModel.countDocuments(appointmentFilter);

                let dashboardData = {
                    totalDoctors,
                    patientSummary,
                    patientStats,
                    appointments,
                    billdata,
                    UnpaindBills,
                    todayAppointments,
                };
                return ResponseService.send(res, StatusCodes.OK, "Dashboard data retrieved successfully", 1, dashboardData);
            }

            else if (req.user.role === "patient") {
                try {
                    const { patientId: queryPatientId } = req.query;
                    const isReceptionist = req.user.role === "receptionist";
                    const patientId = isReceptionist ? queryPatientId : req.user._id;

                    if (!patientId) {
                        return ResponseService.send(
                            res,
                            StatusCodes.BAD_REQUEST,
                            "Patient ID is required.",
                            "error"
                        );
                    }
                    const patientProfile = await User.findById(patientId);
                    if (!patientProfile) {
                        return ResponseService.send(
                            res,
                            StatusCodes.NOT_FOUND,
                            "Patient profile not found",
                            "error"
                        );
                    }
                    let prescriptionsdata = await PrescriptionModel.find({ patientId })
                        .sort({ createdAt: -1 })
                        .populate("patientId", "fullName gender address age phone")
                        .populate("doctorId", "fullName metaData.doctorData.speciality metaData.doctorData.signature")
                        .populate("appointmentId", "dieseas_name type appointmentTime date")
                        .populate("hospitalId", "name");

                    const prescriptions = prescriptionsdata.map((prescription) => {
                        const addressObj = prescription.patientId?.address;
                        const formattedAddress = addressObj
                            ? `${addressObj.fullAddress || "N/A"}, ${addressObj.city || "N/A"}, ${addressObj.state || "N/A"}, ${addressObj.country || "N/A"}, ${addressObj.zipCode || "N/A"}`
                            : "N/A";

                        return {
                            prescriptionId: prescription._id,
                            prescriptionDate: new Date(prescription.date).getDate().toString().padStart(2, '0') + '/' + // DD
                                (new Date(prescription.date).getMonth() + 1).toString().padStart(2, '0') + '/' + // MM
                                new Date(prescription.date).getFullYear().toString().slice(-2),
                            hospitalName: prescription.hospitalId?.name || "N/A",
                            DiseaseName: prescription.appointmentId?.dieseas_name || "N/A",
                            DoctorName: prescription.doctorId?.fullName || "N/A",
                            patientName: prescription.patientId?.fullName || "N/A",
                            patientNumber: prescription.patientId?.phone || "N/A",
                            doctorspecialty: prescription.doctorId?.metaData?.doctorData?.speciality || "N/A",
                            gender: prescription.patientId?.gender || "N/A",
                            age: prescription.patientId?.age || "N/A",
                            address: formattedAddress,
                            medications: prescription.medications || "N/A",
                            additionalNote: prescription.instructions || "N/A",
                            doctorsignature: prescription.doctorId?.metaData?.doctorData?.signature || "N/A",
                            appointmentTime: prescription.appointmentId?.appointmentTime || "N/A",
                            appointmentDate: prescription.appointmentId?.date || "N/A",
                            dieseas_name: prescription.appointmentId?.dieseas_name || "N/A",
                        };
                    });
                    const dashboardData = {
                        patientProfile,
                        prescriptions,
                    };
                    return ResponseService.send(res, StatusCodes.OK, "Dashboard data fetched successfully", "success", dashboardData);
                } catch (error) {
                    console.error("Error fetching patient dashboard data:", error);
                    return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred while fetching patient dashboard data", 0);
                }
            }

        } catch (error) {
            console.error("Error in getDashboardDatademo:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred", 0);
        }
    }

    async reportandanalysis(req, res) {
        try {

            let reportData = {};

            const totalPatients = await AppointmentModel.distinct("patientId");
            reportData.totalPatients = totalPatients.length;

            const repeatPatients = await AppointmentModel.aggregate([
                { $group: { _id: "$patientId", count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 } } }
            ]);
            reportData.repeatPatients = repeatPatients.length;

            // Fetch Appointment Chart Data (Year and Month Wise)
            const appointmentData = await AppointmentModel.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: "$date" },
                            month: { $month: "$date" },
                            type: "$type",
                        },
                        count: { $sum: 1 },
                    },
                },
            ]);

            // Process Year-wise and Month-wise Appointment Data
            reportData.appointmentData = {
                yearWiseData: appointmentData.reduce((acc, cur) => {
                    const yearIndex = acc.findIndex(item => item.year === cur._id.year);
                    const typeKey = cur._id.type === "online" ? "onlineConsultation" : "otherAppointment";
                    if (yearIndex === -1) {
                        acc.push({ year: cur._id.year, [typeKey]: cur.count });
                    } else {
                        acc[yearIndex][typeKey] = (acc[yearIndex][typeKey] || 0) + cur.count;
                    }
                    return acc;
                }, []),
                monthWiseData: appointmentData.reduce((acc, cur) => {
                    const monthKey = `${cur._id.year}-${cur._id.month}`;
                    acc[monthKey] = acc[monthKey] || { onlineConsultation: 0, otherAppointment: 0 };
                    acc[monthKey][cur._id.type === "online" ? "onlineConsultation" : "otherAppointment"] += cur.count;
                    return acc;
                }, {}),
            };

            // Fetch Patient Summary Data (Week Wise and Day Wise)
            const summary = await AppointmentModel.aggregate([
                {
                    $project: {
                        dayOfWeek: { $dayOfWeek: "$date" },
                        patientId: 1,
                    },
                },
                {
                    $group: {
                        _id: "$dayOfWeek",
                        newPatients: { $addToSet: "$patientId" },
                        totalPatients: { $sum: 1 },
                    },
                },
            ]);

            const weekData = Array(7).fill(0).map(() => ({ newPatients: 0, oldPatients: 0 }));
            const patientIdsSeen = new Set();

            summary.forEach(({ _id, newPatients, totalPatients }) => {
                const newCount = newPatients.filter(p => !patientIdsSeen.has(p)).length;
                newPatients.forEach(p => patientIdsSeen.add(p));
                weekData[_id - 1] = {
                    newPatients: newCount,
                    oldPatients: totalPatients - newCount,
                };
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const dailySummary = await AppointmentModel.aggregate([
                {
                    $match: { date: { $gte: today, $lt: tomorrow } },
                },
                {
                    $project: {
                        hour: { $hour: "$date" },
                        patientId: 1,
                    },
                },
                {
                    $group: {
                        _id: "$hour",
                        newPatients: { $addToSet: "$patientId" },
                        totalPatients: { $sum: 1 },
                    },
                },
            ]);

            const hours = [8, 10, 12, 14, 16, 18, 20];
            const dailyData = hours.map(hour => ({ newPatients: 0, oldPatients: 0 }));

            const dailyPatientIdsSeen = new Set();

            dailySummary.forEach(({ _id, newPatients, totalPatients }) => {
                const hourIndex = hours.findIndex(h => h === _id);
                if (hourIndex !== -1) {
                    const newCount = newPatients.filter(p => !dailyPatientIdsSeen.has(p)).length;
                    newPatients.forEach(p => dailyPatientIdsSeen.add(p));
                    dailyData[hourIndex] = {
                        newPatients: newCount,
                        oldPatients: totalPatients - newCount,
                    };
                }
            });

            reportData.patientSummary = {
                week: {
                    categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    data: {
                        newPatients: weekData.map(d => d.newPatients),
                        oldPatients: weekData.map(d => d.oldPatients),
                    },
                },
                day: {
                    categories: ["8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM"],
                    data: {
                        newPatients: dailyData.map(d => d.newPatients),
                        oldPatients: dailyData.map(d => d.oldPatients),
                    },
                },
            };

            // Fetch Patient Count by Department (Group appointments by doctor speciality)
            const departmentData = await AppointmentModel.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "doctorId",
                        foreignField: "_id",
                        as: "doctorData",
                    },
                },
                { $unwind: { path: "$doctorData", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: "$doctorData.metaData.doctorData.speciality",
                        count: { $sum: 1 },
                    },
                },
            ]);

            const patientDepartmentDataMap = new Map();

            await AppointmentModel.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "doctorId",
                        foreignField: "_id",
                        as: "doctorData",
                    },
                },
                { $unwind: { path: "$doctorData", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: { patientId: "$patientId", speciality: "$doctorData.metaData.doctorData.speciality" },
                    },
                },
            ]).then(results => {
                results.forEach(({ _id }) => {
                    if (_id.speciality) {
                        if (!patientDepartmentDataMap.has(_id.speciality)) {
                            patientDepartmentDataMap.set(_id.speciality, 1);
                        }
                    }
                });
            });

            reportData.patientDepartmentData = Array.from(patientDepartmentDataMap.entries()).map((entry, index) => ({
                key: `${index + 1}`,
                name: entry[0],
                count: entry[1].toString(),
            }));

            const doctorData = await User.aggregate([
                { $match: { role: "doctor" } },
                {
                    $group: {
                        _id: "$metaData.doctorData.speciality",
                        count: { $sum: 1 },
                    },
                },
            ]);

            reportData.doctorDepartmentData = doctorData
                .filter(item => item._id)
                .map((item, index) => ({
                    key: `${index + 1}`,
                    name: item._id,
                    count: item.count.toString(),
                }));

            const ageGroups = [
                { range: "0-2 Years", min: 0, max: 2 },
                { range: "3-12 Years", min: 3, max: 12 },
                { range: "13-19 Years", min: 13, max: 19 },
                { range: "20-39 Years", min: 20, max: 39 },
                { range: "40-59 Years", min: 40, max: 59 },
                { range: "60 And Above", min: 60, max: Infinity },
            ];

            const patientData = await User.find({ role: "patient" }, "age");
            reportData.patientAgeDistribution = ageGroups.map(group => ({
                age: group.range,
                value: patientData.filter(p => p.age >= group.min && p.age <= group.max).length,
                color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            }));

            return ResponseService.send(res, StatusCodes.OK, "Report data retrieved successfully", 1, reportData);

        } catch (error) {

            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error retrieving report data", 0, error.message);

        }
    }

}



export default AdminController; 