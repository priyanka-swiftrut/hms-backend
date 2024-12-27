import Appointment from '../models/Appointment.model.js';
import Bill from '../models/Bill.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.model.js';
import Insurance from '../models/Insurance.model.js';

class AppointmentController {
    // async createAppointment(req, res) {
    //     try {
    //         const { doctorId, date, appointmentTime, type, patient_issue, dieseas_name, city, state, country } = req.body;

    //         // Ensure the doctor exists
    //         const doctor = await User.findById(doctorId);
    //         if (!doctor) {
    //             return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
    //         }

    //         // Create appointment data
    //         const appointmentData = {
    //             patientId: req.user.id,
    //             doctorId,
    //             hospitalId: doctor.hospitalId,
    //             date,
    //             appointmentTime,
    //             type,
    //             patient_issue,
    //             dieseas_name,
    //             city,
    //             state,
    //             country,
    //             status: "scheduled",
    //         };

    //         const newAppointment = new Appointment(appointmentData);
    //         await newAppointment.save();

    //         // Create bill for the appointment
    //         const bill = await this.createBill(newAppointment);
    //         if (!bill) {
    //             return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error creating bill.", "error");
    //         }

    //         return ResponseService.send(res, StatusCodes.CREATED, "Appointment and bill created successfully", 1, { appointment: newAppointment, bill });
    //     } catch (error) {
    //         return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
    //     }
    // }

    // /**
    //  * Automatically creates a bill for the given appointment
    //  * @param {Object} appointment - The appointment document
    //  * @returns {Object} - The created bill document
    //  */
    // async createBill(appointment) {
    //     try {
    //         const billData = {
    //             patientId: appointment.patientId,
    //             doctorId: appointment.doctorId,
    //             hospitalId: appointment.hospitalId,
    //             appointmentId: appointment._id,
    //             date: new Date(), // Current date
    //             time: new Date().toLocaleTimeString(), // Current time in string format
    //             status: "Unpaid",
    //         };

    //         const newBill = new Bill(billData);
    //         await newBill.save();
    //         return newBill;
    //     } catch (error) {
    //         console.error("Error creating bill:", error);
    //         return null;
    //     }
    // }


    async createAppointment(req, res) {
        try {
            const { 
                doctorId, 
                date, 
                appointmentTime, 
                type: appointmentType, 
                patient_issue, 
                dieseas_name, 
                city, 
                state, 
                country, 
                paymentType, 
                status, 
                insuranceDetails 
            } = req.body;
    
            // Validate doctor existence
            const doctor = await User.findById(doctorId);
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
            }
    
            // Validate required fields
            if (!["onsite", "online"].includes(appointmentType)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid appointment type.", 0);
            }
            if (!["cash", "online", "Insurance"].includes(paymentType)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
            }
    
            // Prepare appointment data
            const appointmentData = {
                patientId: req.user.id,
                doctorId,
                hospitalId: doctor.hospitalId,
                date,
                appointmentTime,
                type: appointmentType,
                patient_issue,
                dieseas_name,
                city,
                state,
                country,
                status: "scheduled",
            };
    
            const newAppointment = new Appointment(appointmentData);
            await newAppointment.save();
    
            // Conditional bill creation based on `status`
            if (status) {
                const bill = await this.createBill(newAppointment, paymentType, appointmentType, insuranceDetails);
                if (!bill) {
                    return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error creating bill.", "error");
                }
    
                return ResponseService.send(res, StatusCodes.CREATED, "Appointment and bill created successfully.", 1, { appointment: newAppointment, bill });
            }
    
            return ResponseService.send(res, StatusCodes.CREATED, "Appointment created successfully without a bill.", 1, { appointment: newAppointment });
        } catch (error) {
            console.error("Error creating appointment:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
    }
    
    async createBill(appointment, paymentType, appointmentType, insuranceDetails) {
        try {
            const { doctorId, patientId, hospitalId, _id: appointmentId } = appointment;
    
            // Fetch consultation rate based on appointmentType
            const doctor = await User.findById(doctorId);
            if (!doctor) {
                throw new Error("Doctor not found.");
            }
    
            let amount = 0;
            if (appointmentType === "onsite") {
                amount = doctor.consultationRate || 0;
            } else if (appointmentType === "online") {
                amount = doctor.onlineConsultationRate || 0;
            } else {
                throw new Error("Invalid appointment type.");
            }
    
            // Calculate tax and total amount
            const tax = amount * 0.18; // 18% tax
            const totalAmount = amount + tax;
    
            // Handle insurance details if paymentType is "insurance"
            let insuranceId = null;
            if (paymentType === "Insurance") {
                const { insuranceCompany, insurancePlan, claimAmount, claimedAmount } = insuranceDetails || {};
                if (!insuranceCompany || !insurancePlan || claimAmount === undefined || claimedAmount === undefined) {
                    throw new Error("Incomplete insurance details.");
                }
                if (claimAmount < claimedAmount) {
                    throw new Error("Claim amount cannot be less than claimed amount.");
                }
    
                // Create insurance entry
                const newInsurance = new Insurance({
                    patientId,
                    insuranceCompany,
                    insurancePlan,
                    claimAmount,
                    claimedAmount,
                });
                const savedInsurance = await newInsurance.save();
                insuranceId = savedInsurance._id;
            }
    
            // Create bill data
            const billData = {
                patientId,
                doctorId,
                hospitalId,
                appointmentId,
                appointmentType,
                paymentType,
                amount,
                tax,
                totalAmount,
                insuranceId,
                date: new Date(),
                time: new Date().toLocaleTimeString(),
                status: true, // Status is true since we are creating the bill
            };
    
            const newBill = new Bill(billData);
            await newBill.save();
            return newBill;
        } catch (error) {
            console.error("Error creating bill:", error);
            return null;
        }
    }

    async getAppointments(req, res) {
        try {
            
            if(!req.user.id) {
                return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
            }
            if(req.user.role === "doctor") {
                const appointments = await Appointment.find({ doctorId: req.user.id });
                return ResponseService.send(res, StatusCodes.OK, "Appointments retrieved successfully", 1, { appointments });
            }
            if(req.user.role === "patient") {
                const appointments = await Appointment.find({ patientId: req.user.id });
                return ResponseService.send(res, StatusCodes.OK, "Appointments retrieved successfully", 1, { appointments });
            }
            const appointments = await Appointment.find();
            return ResponseService.send(res, StatusCodes.OK, "Appointments retrieved successfully", 1, { appointments });
        } catch (error) {

            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");

        }
    }

    async editAppointment(req, res) {
        try {
            const { id } = req.params;
            const { patient_issue, dieseas_name, city, state, country, status } = req.body;
    
            // Ensure the appointment exists
            const appointment = await Appointment.findById(id);
            if (!appointment) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment not found.", 0);
            }
    
            // Update the appointment data if provided
            if (patient_issue !== undefined) appointment.patient_issue = patient_issue;
            if (dieseas_name !== undefined) appointment.dieseas_name = dieseas_name;
            if (city !== undefined) appointment.city = city;
            if (state !== undefined) appointment.state = state;
            if (country !== undefined) appointment.country = country;
            if (status !== undefined) appointment.status = status;
    
            await appointment.save();
    
            return ResponseService.send(res, StatusCodes.OK, "Appointment updated successfully", 1, { appointment });
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 'error');
        }
    }


    async getDoctor(req, res) {
        try {
            const { doctorId } = req.params;
            const doctor = await User.findById(doctorId);
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
            }
            
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, "error");
        }
    }
}

export default AppointmentController;
