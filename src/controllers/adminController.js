import User from '../models/User.model.js';
import AppointmentModel from "../models/Appointment.model.js";
import BillModel from "../models/Bill.model.js";
import InsuranceModel from "../models/Insurance.model.js";
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import EmailService from '../services/email.service.js';
import cloudinary from '../config/cloudinaryConfig.js';
import crypto from 'crypto';

class AdminController {

    async Register(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            if (req.body.password !== "" && req.body.password === req.body.confirmPassword) {
                let checkmail = await User.findOne({ email: req.body.email });
                if (checkmail) {
                    if (req.files?.profilePicture?.[0]?.path) {
                        await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                    }
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email Already Exists", 0);
                } else {
                    const password = req.body.password;
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
                            const emailHtml = EmailService.registrationTemplate(newUser.fullName, newUser.email, password);
                            await EmailService.sendEmail(newUser.email, "Registration Successful ✔", emailHtml);
                        } catch (emailError) {
                            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User registered, but email sending failed", 0);
                        }
                        return ResponseService.send(res, StatusCodes.OK, "Admin Registered Successfully", 1, newUser);
                    } else {
                        if (req.files?.profilePicture?.[0]?.path) {
                            await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                        }
                        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Something went wrong", 0);
                    }
                }
            } else {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                }
                return ResponseService.send(res, 400, "Password and Confirm Password is Not Matched", 0);
            }
        } catch (error) {
            if (req.files?.profilePicture?.[0]?.path) {
                await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
            }
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async EditProfile(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);

            }
            let user = await User.findById(req.user._id);
            if (user) {
                if (req.files) {
                    if (req.files?.profilePicture?.[0]?.path) {
                        await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                        req.body.profilePicture = req.files.profilePicture[0].path;
                    }
                }
                req.body.fullName = req.body.firstName + " " + req.body.lastName;
                let updatedUser = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
                if (updatedUser) {
                    return ResponseService.send(res, StatusCodes.OK, "Profile Updated Successfully", 1, updatedUser);
                } else {
                    if (req.files?.profilePicture?.[0]?.path) {
                        await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                    }
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to Update Profile", 0);
                }
            }
            else {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User Not Found", 0);
            }
        } catch (error) {
            if (req.files?.profilePicture?.[0]?.path) {
                await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
            }
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }

    async getAdmin(req, res) {
        try {
            const user = await User.findById(req.user._id);
            if (user) {
                return ResponseService.send(res, StatusCodes.OK, "Admin fetched successfully", 1, user);
            } else {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Admin not found", 0);
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
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                } if (req.files?.signature?.[0]?.path) {
                    await this.deleteImage(req.files?.signature?.[0]?.path, "signatureImages");
                }
                return ResponseService.send(res, StatusCodes.FORBIDDEN, "Access denied. Admin only.", 0);
            }
            if (!req.body || Object.keys(req.body).length === 0) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                } if (req.files?.signature?.[0]?.path) {
                    await this.deleteImage(req.files?.signature?.[0]?.path, "signatureImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                } if (req.files?.signature?.[0]?.path) {
                    await this.deleteImage(req.files?.signature?.[0]?.path, "signatureImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Email already exists", 0);
            }
            const hospitalId = req.user.hospitalId;
            if (!hospitalId) {
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                }
                if (req.files?.signature?.[0]?.path) {
                    await this.deleteImage(req.files?.signature?.[0]?.path, "signatureImages");
                }
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
                workon: req.body.workon,
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
                        consultationRate: req.body.consultationRate,
                        emergencyContactNo: req.body.emergencyContactNo,
                        workOn: req.body.workOn,
                        hospitalName: req.body.hospitalName,
                        hospitalAddress: req.body.hospitalAddress,
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
                if (req.files?.profilePicture?.[0]?.path) {
                    await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
                } if (req.files?.signature?.[0]?.path) {
                    await this.deleteImage(req.files?.signature?.[0]?.path, "signatureImages");
                }
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Something went wrong", 0);
            }
        } catch (error) {
            if (req.files?.profilePicture?.[0]?.path) {
                await this.deleteImage(req.files?.profilePicture?.[0]?.path, "profileImages");
            } if (req.files?.signature?.[0]?.path) {
                await this.deleteImage(req.files?.signature?.[0]?.path, "signatureImages");
            }
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

    async deleteImage(path, folder) {
        if (path) {
            const publicId = path.split("/").pop().split(".")[0];
            if (folder) {
                await cloudinary.uploader.destroy(`${folder}/${publicId}`);
            }
        }
    }

    async searchData(req, res) {
        try {
          const { query, role } = req.query;
      
          // Check if the query parameter is provided
          if (!query) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Query parameter is required", 0);
          }
      
          // Define default roles if no specific role is passed
          const defaultRoles = ['doctor', 'patient', 'receptionist'];
      
          // Build the query dynamically
          const searchCriteria = {
            fullName: { $regex: query, $options: 'i' } // Case-insensitive search on fullName
          };
      
          // Add the role filter based on the presence of the role parameter
          if (role) {
            searchCriteria.role = role; // Use the specified role
          } else {
            searchCriteria.role = { $in: defaultRoles }; // Use default roles
          }
      
          // Perform the search
          const results = await User.find(searchCriteria);
      
          // Check if any results were found
          if (results.length === 0) {
            return ResponseService.send(res, StatusCodes.NOT_FOUND, "No results found", 0);
          }
      
          // Return the found results
          return ResponseService.send(res, StatusCodes.OK, results, 1);
      
        } catch (error) {
          // Handle unexpected errors
          console.error("Error in searchData:", error);
          return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred", 0);
        }
      }
      
      async getDashboardData(req, res) {
        try {
            const { hospitalId } = req.user;
    
            // 1. Total Patients and Doctors
            const doctorFilter = { role: "doctor", isActive: true };
            if (hospitalId) doctorFilter.hospitalId = hospitalId;
    
            const totalDoctors = await User.countDocuments(doctorFilter);
    
            // Fetch unique patient IDs from appointments
            const appointmentFilter = {};
            if (hospitalId) appointmentFilter.hospitalId = hospitalId;
    
            const uniquePatientIds = await AppointmentModel.distinct("patientId", appointmentFilter);
    
            const totalPatients = uniquePatientIds.length;
    
            // 2. Patient Summary: Last 10 Days vs Old Patients
            const now = new Date();
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
    
            // 3. Patient Statistics: Year, Month, Week
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
    
            // 4. Appointments with Pagination (Default Page: 1, 10 items per page)
            const { page = 1 } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;
    
            const appointments = await AppointmentModel.find(appointmentFilter)
                .populate("patientId", "fullName")
                .populate("doctorId", "fullName")
                .select("type dieseas_name appointmentTime")
                .skip(skip)
                .limit(limit);
    
            // Combine all data
            const dashboardData = {
                totalDoctors,
                patientSummary,
                patientStats,
                appointments,
            };
    
            // Send Response
            return ResponseService.send(res, StatusCodes.OK, dashboardData, 1);
            return res.status(StatusCodes.OK).json({success: true,data: dashboardData,message: "Dashboard data retrieved successfully",},1);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "An error occurred", 0);
        
        } catch (error) {
            console.error("Error in getDashboardData:", error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "An error occurred while retrieving dashboard data",
            });
        }
    }
    

    async getPaginatedAppointments(req, res) {
    try {
        // Extract query params
        const { page = 1 } = req.query; // Default to page 1 if not provided
        const limit = 10; // Limit to 10 appointments per page
        const skip = (page - 1) * limit;

        // Fetch paginated appointments
        const appointments = await AppointmentModel.find()
        .populate("patientId", "fullName") // Fetch patient name
        .populate("doctorId", "fullName") // Fetch doctor name
        .sort({ date: -1 }) // Sort by date (descending)
        .skip(skip)
        .limit(limit)
        .select("type dieseas_name appointmentTime patientId doctorId");

        // Map appointments to required fields
        const formattedAppointments = appointments.map((appointment) => ({
        patientName: appointment.patientId?.fullName || "Unknown",
        appointmentType: appointment.type,
        doctorName: appointment.doctorId?.fullName || "Unknown",
        diseaseName: appointment.dieseas_name || "N/A",
        appointmentTime: appointment.appointmentTime,
        }));

        // Send response
        return res.status(StatusCodes.OK).json({
        success: true,
        data: {
            appointments: formattedAppointments,
            currentPage: parseInt(page, 10),
            limit,
        },
        message: "Appointments retrieved successfully",
        });
    } catch (error) {
        console.error("Error in getPaginatedAppointments:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "An error occurred while retrieving appointments",
        });
    }
    }

    async getBills(req, res) {
        try {
          const { hospitalId } = req.user; // Get hospitalId from authenticated user
          const { type } = req.query;
            
          if (!hospitalId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "Hospital ID is required",
            });
          }
    
          // Fetch bills based on query
          let bills = [];
          if (type) {
            // Fetch data with insurance details
            bills = await BillModel.find({ hospitalId, paymentType: type })
              .populate("doctorId", "fullName")
              .populate("patientId", "fullName")
              .populate("appointmentId", "dieseas_name")
              .populate("insuranceId", "insuranceCompany insurancePlan")
              .select("billNumber date")
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
            // Default fetch without insurance details
            bills = await BillModel.find({ hospitalId })
              .populate("patientId", "fullName phone")
              .populate("appointmentId", "dieseas_name")
              .select("billNumber status date time")
              .lean();
    
            bills = bills.map((bill) => ({
              billNumber: bill.billNumber,
              patientName: bill.patientId?.fullName || "N/A",
              diseaseName: bill.appointmentId?.dieseas_name || "N/A",
              phoneNumber: bill.patientId?.phone || "N/A",
              status: bill.status,
              date: bill.date,
              time: bill.time,
            }));
          }
    
          // Send the response
          return res.status(StatusCodes.OK).json({
            success: true,
            data: bills,
            message: "Bills retrieved successfully",
          });
        } catch (error) {
          console.error("Error fetching bills:", error);
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An error occurred while retrieving bills",
          });
        }
      }

}


export default AdminController; 