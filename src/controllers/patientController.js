import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import billModel from '../models/Bill.model.js';
import Hospital from '../models/Hospital.model.js';
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
                        phoneCode: req.body.phoneCode,
                        termsAccepted: req.body.termsAccepted,
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
            const { id, search, bloodGroup, age, gender } = req.query;
    
            if (!id) {
                let query = { role: 'patient', isActive: true };
    
                // Add search filter if provided
                if (search) {
                    query.$or = [
                        { "fullName": { $regex: search, $options: 'i' } }, // Case-insensitive search on fullName
                        { "email": { $regex: search, $options: 'i' } },    // Case-insensitive search on email
                        { "phone": { $regex: search, $options: 'i' } }     // Case-insensitive search on phone
                    ];
                }
    
                // Add filters for bloodGroup, age, and gender if provided
                if (bloodGroup) {
                    query["metaData.patientData.bloodGroup"] = bloodGroup;
                }
                if (age) {
                    query.age = age;
                }
                if (gender) {
                    query.gender = gender;
                }
    
                // Fetch all patients based on the query
                const patients = await User.find(query).select("-password"); // Exclude sensitive fields like password
                if (patients.length > 0) {
                    const formattedPatients = patients.map(patient => ({
                        id: patient._id,
                        fullName: patient.fullName,
                        email: patient.email,
                        phone: patient.phone,
                        gender: patient.gender,
                        age: patient.age,
                        bloodGroup: patient.metaData?.patientData?.bloodGroup,
                        address: patient.address,
                        metaData: patient.metaData,
                        createdAt: patient.createdAt
                    }));
                    return ResponseService.send(res, StatusCodes.OK, "Patients fetched successfully", 1, formattedPatients);
                } else {
                    return ResponseService.send(res, StatusCodes.NOT_FOUND, "No patients found", 0);
                }
            } else {
                // Fetch a single patient by ID
                const patient = await User.findOne({ _id: id, role: 'patient', isActive: true }).select("-password");
                if (patient) {
                    const formattedPatient = {
                        id: patient._id,
                        fullName: patient.fullName,
                        email: patient.email,
                        phone: patient.phone,
                        gender: patient.gender,
                        age: patient.age,
                        bloodGroup: patient.metaData?.patientData?.bloodGroup,
                        address: patient.address,
                        metaData: patient.metaData,
                        createdAt: patient.createdAt
                    };
                    return ResponseService.send(res, StatusCodes.OK, "Patient fetched successfully", 1, formattedPatient);
                } else {
                    return ResponseService.send(res, StatusCodes.NOT_FOUND, "Patient not found", 0);
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
            const { id } = req.user; 
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
    
    async getDoctorAndHospital(req, res) {
        try {
            // Fetch all hospital data
            const hospitalData = await Hospital.find();
            if (!hospitalData || hospitalData.length === 0) {
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
    
            if (!doctorData || doctorData.length === 0) {
                return ResponseService.send(
                    res,
                    StatusCodes.NOT_FOUND,
                    "No active doctors found",
                    0,
                    {}
                );
            }
    
            // Transform the doctorData using a map loop
            const transformedDoctorData = doctorData.map(doctor => ({
                id: doctor._id,
                fullName: doctor.fullName,
                speciality: doctor.metaData?.doctorData?.speciality || "N/A",
                address: {
                    country: doctor.address?.country || "N/A",
                    state: doctor.address?.state || "N/A",
                    city: doctor.address?.city || "N/A",
                    zipCode: doctor.address?.zipCode || "N/A",
                    fullAddress: doctor.address?.fullAddress || "N/A"
                },
                hospital: {
                    id: doctor.hospitalId?._id || null,
                    name: doctor.hospitalId?.name || "N/A",
                    address: doctor.hospitalId?.address || "N/A",
                    zipcode: doctor.hospitalId?.zipcode || "N/A",
                    worksiteLink: doctor.hospitalId?.worksiteLink || "N/A"
                }
            }));
    
            // Send the transformed data in the response
            return ResponseService.send(
                res,
                StatusCodes.OK,
                "Doctor and hospital fetched successfully",
                1,
                {  doctorData: transformedDoctorData }
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
