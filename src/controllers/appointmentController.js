import Appointment from '../models/Appointment.model.js';
import Bill from '../models/Bill.model.js';
import hospitalModel from '../models/Hospital.model.js';
import userModel from '../models/User.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.model.js';
import Insurance from '../models/Insurance.model.js';
import moment from 'moment';
import sendNotification from '../services/notificationService.js';

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
                type,
                patient_issue,
                dieseas_name,
                city,
                state,
                country,
                paymentType,
                paymentStatus,
                insuranceDetails
            } = req.body;

            let patientId;
            if (req.user.role === "patient") {
                patientId = req.user.id;
            } else if (req.user.role === "receptionist") {              
                patientId = req.body.patientId;
            }
            // Validate doctor existence
            const doctor = await User.findById(doctorId);
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
            }

            // Validate payment type and appointment type
            if (req.user.role !== "receptionist" && paymentType === "cash" && type === "online") {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
            }
            if (!["onsite", "online"].includes(type)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid appointment type.", 0);
            }
            if (!["Cash", "Online", "Insurance"].includes(paymentType)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
            }

            // Check for duplicate appointments
            let isAppointment = false;
            if (appointmentTime) {
                const isDoctorAppointment = await Appointment.find({ doctorId, date, appointmentTime });
                const isPatientAppointment = await Appointment.find({ patientId: patientId, date, appointmentTime });

                if (isDoctorAppointment.length > 0 || isPatientAppointment.length > 0) {
                    isAppointment = true;
                }
            }
            if (isAppointment) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment already exists.", 0);
            }

            // Prepare appointment data
            const appointmentData = {
                patientId,
                doctorId,
                hospitalId: doctor.hospitalId,
                date,
                appointmentTime,
                type: type,
                patient_issue,
                dieseas_name,
                city,
                state,
                country,
                status: "scheduled",
            };

            const newAppointment = new Appointment(appointmentData);
            await newAppointment.save();

            // Conditional bill creation
            if (paymentStatus || paymentType === "Cash" || paymentType === "Insurance") {
                const bill = await this.createBill(req, newAppointment, paymentType, type, insuranceDetails);
                if (!bill) {
                    return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Appointment booked but error generating bill.", 0);
                }

                await sendNotification({
                    type: 'Appoitement',
                    message: `Appoitement Booked Succesfully: ${newAppointment.date} at ${newAppointment.appointmentTime}`,
                    hospitalId: doctor.hospitalId,
                    targetUsers: patientId,
                });

                await sendNotification({
                    type: 'Appoitement',
                    message: `You have new Appoitement on : ${newAppointment.date} at ${newAppointment.appointmentTime}`,
                    hospitalId: doctor.hospitalId,
                    targetUsers: doctorId,
                });
                return ResponseService.send(res, StatusCodes.CREATED, "Appointment and bill created successfully.", 1, { appointment: newAppointment, bill });
            }
            return ResponseService.send(res, StatusCodes.CREATED, "Appointment created successfully without a bill.", 1, { appointment: newAppointment });
        } catch (error) {
            console.error("Error creating appointment:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async createBill(req, appointment, paymentType, type, insuranceDetails) {
        try {
            const { doctorId, patientId, hospitalId, _id: appointmentId } = appointment;

            // Fetch consultation rate based on type
            const doctor = await User.findById(doctorId);
            if (!doctor) {
                throw new Error("Doctor not found.");
            }

            if (req.user.role !== "receptionist" && paymentType === "cash" && type === "online") {
                throw new Error("Invalid payment type.");
            }

            let amount = 0;
            if (type === "onsite") {
                amount = doctor.metaData.doctorData.consultationRate || 0;
            } else if (type === "online") {
                amount = doctor.metaData.doctorData.onlineConsultationRate || 0;
            } else {
                throw new Error("Invalid appointment type.");
            }

            // Calculate tax and total amount
            const tax = amount * 0.18; // 18% tax
            const totalAmount = amount + tax;

            // Initialize variables for insurance and dueAmount
            let insuranceId = null;
            let dueAmount = 0;

            // Handle insurance details if paymentType is "Insurance"
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

                // Calculate dueAmount if claimedAmount is less than totalAmount
                if (claimedAmount < totalAmount) {
                    dueAmount = totalAmount - claimedAmount;
                }
            }

            // Create bill data
            const billData = {
                patientId,
                doctorId,
                hospitalId,
                appointmentId,
                type,
                paymentType,
                amount,
                tax,
                totalAmount,
                dueAmount, // Include calculated dueAmount
                insuranceId,
                date: new Date(),
                time: new Date().toLocaleTimeString(),
                status: true, // Status is true since we are creating the bill
            };
            
            const newBill = new Bill(billData);
            await newBill.save();

            const populatedBill = await Bill.findById(newBill._id)
            .populate('patientId', 'fullName email gender age phone address')
            .populate('doctorId', 'fullName metadata.doctorData.specialization metadata.doctorData.description metadata.doctorData.onlineConsultationRate metadata.doctorData.consultationRate')
            .populate('appointmentId', 'date appointmentTime status dieseas_name');

            await sendNotification({
                type: 'Bill',
                message: `Bill Created Succesfully: ${newBill.date} at ${newBill.time}`,
                hospitalId: hospitalId,
                targetUsers: patientId,
            }); 

            return populatedBill;
        } catch (error) {
            console.error("Error creating bill:", error);
            return null;
        }
    }
        
    // async getAppointments(req, res) {
    //     try {
    //         // Validate user ID
    //         if (!req.user.id) {
    //             return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
    //         }

    //         const { filter, page = 1, limit = 15 } = req.query;
    //         const paginationLimit = parseInt(limit, 10);
    //         const paginationSkip = (parseInt(page, 10) - 1) * paginationLimit;

    //         const filters = {};
    //         const today = new Date();
    //         today.setHours(0, 0, 0, 0); // Start of the day
    //         const tomorrow = new Date(today);
    //         tomorrow.setDate(today.getDate() + 1);

    //         // Apply role-based filters
    //         if (req.user.role === "doctor") {
    //             filters.doctorId = req.user.id;
    //         } else if (req.user.role === "patient") {
    //             filters.patientId = req.user.id;
    //         }

    //        // Apply date-based filters
    //         if (filter === "today") {
    //             filters.date = { $gte: today, $lt: tomorrow };
    //         } else if (filter === "upcoming") {
    //             filters.date = { $gt: today };
    //         } else if (filter === "previous") {
    //             filters.date = { $lt: today };
    //         }

    //         // Apply status filter for canceled appointments
    //         if (filter === "cancel") {
    //             filters.status = "canceled";
    //         }

    //         // Fetch appointments with pagination
    //         const appointments = await Appointment.find(filters)
    //             .skip(paginationSkip)
    //             .limit(paginationLimit)
    //             .sort({ date: 1 }) // Sort by date (ascending)
    //             .populate("doctorId", "fullName email profilePicture phone age gender address")
    //             .populate("patientId", "fullName email")
    //             .populate("hospitalId", "name");

    //         // Format the date field
    //         const formattedAppointments = appointments.map((appointment) => {
    //             const formattedDate = new Date(appointment.date).toLocaleDateString("en-US", {
    //                 day: "numeric",
    //                 month: "short",
    //                 year: "numeric",
    //             });
    //             return {
    //                 ...appointment.toObject(),
    //                 date: formattedDate,
    //             };
    //         });

    //         const totalAppointments = await Appointment.countDocuments(filters);

    //         return ResponseService.send(res, StatusCodes.OK, "Appointments retrieved successfully", 1, {
    //             appointments: formattedAppointments,
    //             pagination: {
    //                 total: totalAppointments,
    //                 page: parseInt(page, 10),
    //                 limit: paginationLimit,
    //                 totalPages: Math.ceil(totalAppointments / paginationLimit),
    //             },
    //         });
    //     } catch (error) {
    //         return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    //     }
    // }

    async getAppointments(req, res) {
        try {
            // Validate user ID
            if (!req.user.id) {
                return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
            }

            const { filter, date, startDate, endDate, page = 1, limit = 15 } = req.query;
            const paginationLimit = parseInt(limit, 10);
            const paginationSkip = (parseInt(page, 10) - 1) * paginationLimit;

            const filters = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of the day
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            // Apply role-based filters
            if (req.user.role === "doctor") {
                filters.doctorId = req.user.id;
            } else if (req.user.role === "patient") {
                filters.patientId = req.user.id;
            } else {
                // For non-patient roles, include hospitalId if available
                if (req.user.hospitalId) {
                    filters.hospitalId = req.user.hospitalId;
                }
            }

            // Apply date-based filters
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Include the end date's entire day
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid start or end date format", 0);
                }
                filters.date = { $gte: start, $lte: end };
            } else if (date) {
                const selectedDate = new Date(date);
                selectedDate.setHours(0, 0, 0, 0);
                const nextDay = new Date(selectedDate);
                nextDay.setDate(selectedDate.getDate() + 1);
                filters.date = { $gte: selectedDate, $lt: nextDay };
            } else if (filter === "today") {
                filters.date = { $gte: today, $lt: tomorrow };
            } else if (filter === "upcoming") {
                filters.date = { $gt: today };
            } else if (filter === "previous") {
                filters.date = { $lt: today };
            }

            // Apply status filter for canceled appointments
            if (filter === "cancel") {
                filters.status = "canceled";
            }

            // Fetch appointments with pagination
            const appointments = await Appointment.find(filters)
                .skip(paginationSkip)
                .limit(paginationLimit)
                .sort({ date: 1 }) // Sort by date (ascending)
                .populate("doctorId", "fullName email profilePicture phone age gender address")
                .populate("patientId", "fullName email")
                .populate("hospitalId", "name");

            // Format the date field
            const formattedAppointments = appointments.map((appointment) => {
                const formattedDate = new Date(appointment.date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                });
                return {
                    ...appointment.toObject(),
                    date: formattedDate,
                };
            });

            const totalAppointments = await Appointment.countDocuments(filters);

            return ResponseService.send(res, StatusCodes.OK, "Appointments retrieved successfully", 1, {
                appointments: formattedAppointments,
                pagination: {
                    total: totalAppointments,
                    page: parseInt(page, 10),
                    limit: paginationLimit,
                    totalPages: Math.ceil(totalAppointments / paginationLimit),
                },
            });
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }



    async getAppointmentsTeleconsultation(req, res) {
        try {
            // Validate user ID
            if (!req.user.id) {
                return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
            }

            const { filter, page = 1, limit = 15, type, specificDate, startDate, endDate } = req.query;
            const paginationLimit = parseInt(limit, 10);
            const paginationSkip = (parseInt(page, 10) - 1) * paginationLimit;

            const filters = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of the day
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            // Apply role-based filters
            if (req.user.role === "doctor") {
                filters.doctorId = req.user.id;
            } else if (req.user.role === "patient") {
                filters.patientId = req.user.id;
            }

            // Apply date-based filters
            if (filter === "today") {
                filters.date = { $gte: today, $lt: tomorrow };
            } else if (filter === "upcoming") {
                filters.date = { $gt: today };
            } else if (filter === "previous") {
                filters.date = { $lt: today };
            } else if (filter === "cancel") {
                filters.status = "canceled";
            }

            // Apply specific date filter
            if (specificDate) {
                const specificDateObj = new Date(specificDate);
                if (isNaN(specificDateObj.getTime())) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid specific date format", 0);
                }
                const specificStartOfDay = new Date(specificDateObj.setHours(0, 0, 0, 0));
                const specificEndOfDay = new Date(specificDateObj.setHours(23, 59, 59, 999));
                filters.date = { $gte: specificStartOfDay, $lte: specificEndOfDay };
            }

            // Apply start date and end date filter
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid start or end date format", 0);
                }
                filters.date = { $gte: start, $lte: end };
            }

            // Apply type filter
            if (type === "onsite" || type === "online") {
                filters.type = type;
            }

            // Fetch appointments with pagination
            const appointments = await Appointment.find(filters)
                .skip(paginationSkip)
                .limit(paginationLimit)
                .sort({ date: 1 }) // Sort by date (ascending)
                .populate("doctorId", "fullName email profilePicture phone age gender address")
                .populate("patientId", "fullName email")
                .populate("hospitalId", "name");

            // Format the date field
            const formattedAppointments = appointments.map((appointment) => {
                const formattedDate = new Date(appointment.date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                });
                return {
                    ...appointment.toObject(),
                    date: formattedDate,
                };
            });

            const totalAppointments = await Appointment.countDocuments(filters);

            return ResponseService.send(res, StatusCodes.OK, "Appointments retrieved successfully", 1, {
                appointments: formattedAppointments,
                pagination: {
                    total: totalAppointments,
                    page: parseInt(page, 10),
                    limit: paginationLimit,
                    totalPages: Math.ceil(totalAppointments / paginationLimit),
                },
            });
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }



    async getpatientfromappointment(req, res) {
        try {
            const { id } = req.params;

            // Ensure the appointment exists
            const appointment = await Appointment.findById(id)
                .populate("patientId", "fullName phone age gender address")
                .populate("doctorId", "fullName  metaData.doctorData.onlineConsultationRate metaData.doctorData.consultationRate")
                .populate("hospitalId", "name");

            if (!appointment) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment not found.", 0);
            }

            let amount = 0;
            let tax = 0;
            if (appointment.type === "online") {
                amount = appointment.doctorId.metaData.doctorData.onlineConsultationRate;
                tax = amount * 0.18;
            } else if (appointment.type === "onsite") {
                amount = appointment.doctorId.metaData.doctorData.consultationRate;
                tax = amount * 0.18;
            }



            // Fetch consultation rate


            // Format the patient's address into a string
            if (appointment.patientId && appointment.patientId.address) {
                const address = appointment.patientId.address;
                const formattedAddress = `${address.fullAddress}, ${address.city}, ${address.state}, ${address.country}, ${address.zipCode}`;
                appointment.patientId.formattedAddress = formattedAddress; // Add the formatted address to the response
            }

            // Format the date field
            if (appointment.date) {
                appointment.formattedDate = new Date(appointment.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }); // Convert the date to "2 Jan, 2025"
            }
            
            // Return the response
            return ResponseService.send(res, StatusCodes.OK, "Appointment fetched successfully", 1, {
                appointment: {
                    ...appointment.toObject(),
                    patientId: {
                        ...appointment.patientId.toObject(),
                        address: appointment.patientId.formattedAddress, // Send formatted address
                    },
                    date: appointment.formattedDate, // Send formatted date
                    amount,
                    tax,
                },
            });
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async editAppointment(req, res) {
        try {
            const { id } = req.params;
            const {
                doctorId,
                patientId,
                date,
                appointmentTime,
                patient_issue,
                dieseas_name,
                city,
                state,
                country,
                status
            } = req.body;

            // Ensure the appointment exists
            const appointment = await Appointment.findById(id);
            if (!appointment) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment not found.", 0);
            }

            // Role-based permission check
            if (req.user.role !== "receptionist" && (doctorId || patientId)) {
                return ResponseService.send(
                    res,
                    StatusCodes.FORBIDDEN,
                    "You do not have permission to update sensitive fields like doctorId or patientId.",
                    0
                );
            }

            // Conflict check only if doctorId, patientId, date, or appointmentTime are being updated
            if (doctorId || patientId || date || appointmentTime) {
                const conflictQuery = {
                    $or: [
                        { doctorId: doctorId || appointment.doctorId, date: date || appointment.date, appointmentTime: appointmentTime || appointment.appointmentTime },
                        { patientId: patientId || appointment.patientId, date: date || appointment.date, appointmentTime: appointmentTime || appointment.appointmentTime }
                    ],
                    _id: { $ne: id } // Exclude the current appointment
                };

                const conflict = await Appointment.findOne(conflictQuery);
                if (conflict) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Another appointment already exists at the given time.", 0);
                }
            }

            // Update the appointment data if provided
            if (doctorId) appointment.doctorId = doctorId;
            if (patientId) appointment.patientId = patientId;
            if (date) appointment.date = date;
            if (appointmentTime) appointment.appointmentTime = appointmentTime;
            if (patient_issue !== undefined) appointment.patient_issue = patient_issue;
            if (dieseas_name !== undefined) appointment.dieseas_name = dieseas_name;
            if (city !== undefined) appointment.city = city;
            if (state !== undefined) appointment.state = state;
            if (country !== undefined) appointment.country = country;
            if (status !== undefined) appointment.status = status;

            await appointment.save();

            return ResponseService.send(res, StatusCodes.OK, "Appointment updated successfully", 1, { appointment });
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }


    async getDoctorSession(req, res) {
        try {
            const { doctorId } = req.params;
            const { date } = req.query;
            const targetDate = date || moment().format("YYYY-MM-DD");

            const doctor = await User.findById(doctorId);
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
            }

            const { morningSession: morning, eveningSession: evening, duration: timeduration } = doctor.metaData.doctorData;
            if (!morning || !evening || !timeduration) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor session data is incomplete.", 0);
            }

            const parseSession = (sessionString) => {
                const [start, end] = sessionString.split(" to ");
                return { start, end };
            };

            const morningSession = parseSession(morning);
            const eveningSession = parseSession(evening);

            const generateSlots = (session, duration) => {
                const slots = [];
                let startTime = moment(session.start, "HH:mm");
                const endTime = moment(session.end, "HH:mm");

                while (startTime < endTime) {
                    const slotEndTime = moment(startTime).add(duration, "minutes");
                    slots.push({
                        start: startTime.format("HH:mm"),
                        end: slotEndTime.format("HH:mm"),
                        available: true
                    });
                    startTime = slotEndTime;
                }

                return slots;
            };

            const morningSlots = generateSlots(morningSession, timeduration);
            const eveningSlots = generateSlots(eveningSession, timeduration);

            const startOfDay = moment(targetDate).startOf("day").toISOString();
            const endOfDay = moment(targetDate).endOf("day").toISOString();

            const appointments = await Appointment.find({
                doctorId,
                date: { $gte: startOfDay, $lt: endOfDay }
            });

            const checkAvailability = (slots, appointments) => {
                slots.forEach(slot => {
                    appointments.forEach(appointment => {
                        if (
                            moment(appointment.appointmentTime, "HH:mm").isBetween(
                                moment(slot.start, "HH:mm"),
                                moment(slot.end, "HH:mm"),
                                null,
                                "[)"
                            )
                        ) {
                            slot.available = false;
                        }
                    });
                });
            };

            checkAvailability(morningSlots, appointments);
            checkAvailability(eveningSlots, appointments);
            const data = {
                morningSlots,
                eveningSlots
            }
            return ResponseService.send(res, StatusCodes.OK, ' Data fetched Succesfully', 1, data);
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async getAppointmentsWithoutBills(req, res) {

        try {
            const hospitalId = req.user.hospitalId; // Access hospitalId from the request

            // Fetch all appointment IDs present in bills
            const billedAppointmentIds = await Bill.find({ hospitalId })
                .distinct("appointmentId");

            // Fetch appointments not in the billed list and matching the hospitalId
            const appointmentsWithoutBills = await Appointment.find({
                hospitalId,
                _id: { $nin: billedAppointmentIds },
            })
                .populate("doctorId", "fullName") // Populate doctor name
                .populate("patientId", "fullName") // Populate patient name
                .select("date appointmentTime doctorId patientId id"); // Select required fields

            // Format the output
            const result = appointmentsWithoutBills.map((appointment) => ({
                doctorData: appointment.doctorId,
                patientData: appointment.patientId,
                appointmentTime: appointment.appointmentTime,
                date: new Date(appointment.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", }),
                id: appointment.id,
            }));

            return ResponseService.send(res, StatusCodes.OK, "Appointments without bills fetched successfully", 1, result);
        } catch (error) {
            console.error("Error fetching appointments without bills:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching appointments without bills", 0);
        }

    }

    async getseacrchingforappointment(req, res) {
        try {
            const hospitals = await hospitalModel.find({}, { _id: 1, country: 1, state: 1, city: 1, name: 1 });
            const doctors = await userModel.find(
                { role: "doctor" },
                {
                    fullName: 1,
                    "metaData.doctorData.speciality": 1,
                    hospitalId: 1,
                    _id: 1,
                }
            ).lean();

            const doctorMap = {};
            doctors.forEach((doc) => {
                if (!doctorMap[doc.hospitalId]) {
                    doctorMap[doc.hospitalId] = [];
                }
                doctorMap[doc.hospitalId].push({
                    name: doc.fullName,
                    id: doc._id,
                    speciality: doc.metaData?.doctorData?.speciality || "Speciality not found",
                });
            });

            const countryMap = {};
            hospitals.forEach((hospital) => {
                const { country, state, city, name: hospitalName, _id } = hospital;

                if (!countryMap[country]) {
                    countryMap[country] = {};
                }

                if (!countryMap[country][state]) {
                    countryMap[country][state] = {};
                }

                if (!countryMap[country][state][city]) {
                    countryMap[country][state][city] = [];
                }

                const hospitalData = {
                    name: hospitalName,
                    specialties: [],
                };

                if (doctorMap[_id]) {
                    const specialtiesMap = {};
                    doctorMap[_id].forEach((doc) => {
                        if (!specialtiesMap[doc.speciality]) {
                            specialtiesMap[doc.speciality] = [];
                        }
                        specialtiesMap[doc.speciality].push({ name: doc.name, id: doc.id }); // Include doctor ID here
                    });

                    hospitalData.specialties = Object.entries(specialtiesMap).map(([speciality, doctors]) => ({
                        speciality,
                        doctors,
                    }));
                }

                countryMap[country][state][city].push(hospitalData);
            });

            const result = Object.entries(countryMap).map(([country, states]) => ({
                country,
                states: Object.entries(states).map(([state, cities]) => ({
                    state,
                    cities: Object.entries(cities).map(([city, hospitals]) => ({
                        city,
                        hospitals,
                    })),
                })),
            }));

            return res.status(200).json(result);
        } catch (error) {
            console.error("Error in hierarchical data API:", error);
            return res.status(500).json({ message: "Internal Server Error", error: error.message });
        }
    }


    // async getseacrchingforappointment(req, res) {

    //     try {
    //         const { country, state, city, hospitalName, speciality, doctor } = req.query;

    //         // Filters to apply based on the query parameters
    //         const hospitalFilters = {};
    //         const doctorFilters = { role: "doctor" };

    //         if (country) hospitalFilters.country = country;
    //         if (state) hospitalFilters.state = state;
    //         if (city) hospitalFilters.city = city;
    //         if (hospitalName) hospitalFilters.name = hospitalName;

    //         if (speciality) doctorFilters["metaData.doctorData.speciality"] = speciality;
    //         if (doctor) doctorFilters.fullName = { $regex: new RegExp(doctor, "i") };

    //         // Step 1: Fetch possible options for each dropdown
    //         const countries = await hospitalModel.distinct("country", hospitalFilters);
    //         const states = await hospitalModel.distinct("state", hospitalFilters);
    //         const cities = await hospitalModel.distinct("city", hospitalFilters);
    //         const hospitals = await hospitalModel.distinct("name", hospitalFilters);

    //         let specialties = [];
    //         if (hospitalName || country || state || city) {
    //             const hospitalsMatchingFilters = await hospitalModel.find(hospitalFilters, { _id: 1 });
    //             const hospitalIds = hospitalsMatchingFilters.map((h) => h._id);
    //             specialties = await userModel.distinct("metaData.doctorData.speciality", {
    //                 ...doctorFilters,
    //                 hospitalId: { $in: hospitalIds },
    //             });
    //         } else {
    //             specialties = await userModel.distinct("metaData.doctorData.speciality", doctorFilters);
    //         }

    //         let doctors = [];
    //         if (speciality || hospitalName || country || state || city) {
    //             const hospitalsMatchingFilters = await hospitalModel.find(hospitalFilters, { _id: 1 });
    //             const hospitalIds = hospitalsMatchingFilters.map((h) => h._id);
    //             doctors = await userModel.find(
    //                 { ...doctorFilters, hospitalId: { $in: hospitalIds } },
    //                 { fullName: 1, _id: 0 }
    //             );
    //         } else {
    //             doctors = await userModel.find(doctorFilters, { fullName: 1, _id: 0 });
    //         }

    //         // Send response with all possible options
    //         res.status(200).json({
    //             countries,
    //             states,
    //             cities,
    //             hospitals,
    //             specialties,
    //             doctors: doctors.map((d) => d.fullName),
    //         });
    //     } catch (error) {
    //         console.error("Error in search-options API:", error);
    //         res.status(500).json({ message: "Internal Server Error", error: error.message });
    //     }

    // }

    async chatcontect(req, res) {

        try {
            const { id, role } = req.user;

            if (role === "patient") {
                // Fetch unique doctors the patient has appointments with
                const appointments = await Appointment.find({ patientId: id })
                    .populate("doctorId", "fullName profilePicture")
                    .select("doctorId");

                const uniqueDoctors = appointments.reduce((acc, appointment) => {
                    const doctor = appointment.doctorId;
                    if (!acc.some((d) => d._id.toString() === doctor._id.toString())) {
                        acc.push(doctor);
                    }
                    return acc;
                }, []);

                return res.status(200).json({
                    success: true,
                    data: uniqueDoctors,
                });
            } else if (role === "doctor") {
                // Fetch unique patients the doctor has appointments with
                const appointments = await Appointment.find({ doctorId: id })
                    .populate("patientId", "fullName profilePicture")
                    .select("patientId");

                const uniquePatients = appointments.reduce((acc, appointment) => {
                    const patient = appointment.patientId;
                    if (!acc.some((p) => p._id.toString() === patient._id.toString())) {
                        acc.push(patient);
                    }
                    return acc;
                }, []);

                return res.status(200).json({
                    success: true,
                    data: uniquePatients,
                });
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Only patients and doctors can access this endpoint.",
                });
            }
        } catch (error) {
            console.error("Error fetching chat connections:", error);
            res.status(500).json({
                success: false,
                message: "An error occurred while fetching chat connections.",
            });
        }

    }

}

export default AppointmentController;
