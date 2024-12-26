import User from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import EmailService from '../services/email.service.js';

const deleteImage = async (path) => {
    if (path) {
        const publicId = path.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`profileImages/${publicId}`);
    }
};

class PatientController {
    async Register(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                await deleteImage(req.files?.profilePicture?.[0]?.path);
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }
            if (req.body.password !== req.body.confirmPassword) {
                await deleteImage(req.files?.profilePicture?.[0]?.path);
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Password and Confirm Password do not match", 0);
            }
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                await deleteImage(req.files?.profilePicture?.[0]?.path);
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
                await deleteImage(req.files?.profilePicture?.[0]?.path);
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
            }

            const patient = await User.findById(req.user._id);
            if (!patient) {
                await deleteImage(req.files?.profilePicture?.[0]?.path);
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
                await deleteImage(req.files?.profilePicture?.[0]?.path);
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

}

export default PatientController;
