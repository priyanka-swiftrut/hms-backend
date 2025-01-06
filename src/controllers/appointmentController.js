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
                type: appointmentType,
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
            } else if(req.user.role ===  "receptionist") {
                patientId = req.body.patientId;
            }
            // Validate doctor existence
            const doctor = await User.findById(doctorId);
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
            }

            // Validate payment type and appointment type
            if (req.user.role !== "receptionist" && paymentType === "cash" && appointmentType === "online") {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
            }
            if (!["onsite", "online"].includes(appointmentType)) {
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

            // Conditional bill creation
            if (paymentStatus) {
                const bill = await this.createBill(req, newAppointment, paymentType, appointmentType, insuranceDetails);
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

    async createBill(req, appointment, paymentType, appointmentType, insuranceDetails) {
        try {
            const { doctorId, patientId, hospitalId, _id: appointmentId } = appointment;
            // Fetch consultation rate based on appointmentType
            const doctor = await User.findById(doctorId);
            if (!doctor) {
                throw new Error("Doctor not found.");
            }

            if (req.user.role !== "receptionist" && paymentType === "cash" && appointmentType === "online") {
                throw new Error("Invalid payment type.");
            }

            let amount = 0;
            if (appointmentType === "onsite") {
                amount = doctor.metaData.doctorData.consultationRate || 0;
            } else if (appointmentType === "online") {
                amount = doctor.metaData.doctorData.onlineConsultationRate || 0;
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

            const { filter, date, page = 1, limit = 15 } = req.query;
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
            if (date) {
                // Date-wise query
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

            const { filter, page = 1, limit = 15, type } = req.query;
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
            }

            // Apply status filter for canceled appointments
            if (filter === "cancel") {
                filters.status = "canceled";
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
                .populate("doctorId", "fullName");

            if (!appointment) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment not found.", 0);
            }

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
                },
            });
        } catch (error) {
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async editAppointment(req, res) {
        try {
            const { id } = req.params;

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
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    async getDoctorSession(req, res) {
        try {
            const { doctorId } = req.params;
            const { date } = req.query; // Get the date from the query params
            console.log("date", date);
            const targetDate = date || moment().format("YYYY-MM-DD"); // Use the provided date or default to today

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

            // Define the start and end of the target date for filtering
            const startOfDay = moment(targetDate).startOf("day").toISOString();
            const endOfDay = moment(targetDate).endOf("day").toISOString();

            const appointments = await Appointment.find({
                doctorId,
                date: { $gte: startOfDay, $lt: endOfDay } // Match appointments within the target date range
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

            return ResponseService.send(res, StatusCodes.OK, { morningSlots, eveningSlots }, 1);
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
                .select("date appointmentTime doctorId patientId"); // Select required fields

            // Format the output
            const result = appointmentsWithoutBills.map((appointment) => ({
                doctorName: appointment.doctorId?.fullName,
                patientName: appointment.patientId?.fullName,
                appointmentTime: appointment.appointmentTime,
                date: new Date(appointment.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", })
            }));

            return ResponseService.send(res, StatusCodes.OK, "Appointments without bills fetched successfully", 1, result);
        } catch (error) {
            console.error("Error fetching appointments without bills:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching appointments without bills", 0);
        }

    }

    async getseacrchingforappointment(req, res) {

        try {
            const { country, state, city, hospitalName, speciality, doctor } = req.query;

            // Step 1: Fetch countries
            if (!country && !state && !city && !hospitalName && !speciality && !doctor) {
                const countries = await hospitalModel.distinct("country");
                return res.status(200).json({ countries });
            }

            // Step 2: Fetch states for a given country
            if (country && !state && !city && !hospitalName && !speciality && !doctor) {
                const states = await hospitalModel.distinct("state", { country });
                if (!states.length) {
                    return res.status(404).json({ message: `No states found for country: ${country}` });
                }
                return res.status(200).json({ states });
            }

            // Step 3: Fetch cities for a given country and state
            if (country && state && !city && !hospitalName && !speciality && !doctor) {
                const cities = await hospitalModel.distinct("city", { country, state });
                if (!cities.length) {
                    return res.status(404).json({ message: `No cities found for state: ${state}, country: ${country}` });
                }
                return res.status(200).json({ cities });
            }

            // Step 4: Fetch hospital names for a given country, state, and city
            if (country && state && city && !hospitalName && !speciality && !doctor) {
                const hospitals = await hospitalModel.find(
                    { country, state, city },
                    { name: 1, _id: 0 }
                ).distinct("name");
                if (!hospitals.length) {
                    return res.status(404).json({
                        message: `No hospitals found for city: ${city}, state: ${state}, country: ${country}`,
                    });
                }
                return res.status(200).json({ hospitals });
            }

            // Step 5: Fetch specialties for a given hospital
            if (country && state && city && hospitalName && !speciality && !doctor) {
                const hospital = await hospitalModel.findOne({ name: hospitalName, country, state, city });
                if (!hospital) {
                    return res.status(404).json({ message: `Hospital not found: ${hospitalName}` });
                }

                const specialties = await userModel.distinct("metaData.doctorData.speciality", {
                    role: "doctor",
                    hospitalId: hospital._id,
                });
                if (!specialties.length) {
                    return res.status(404).json({ message: `No specialties found for hospital: ${hospitalName}` });
                }
                return res.status(200).json({ specialties });
            }

            // Step 6: Fetch doctors for a given specialty and hospital
            if (country && state && city && hospitalName && speciality && !doctor) {
                const hospital = await hospitalModel.findOne({ name: hospitalName, country, state, city });
                if (!hospital) {
                    return res.status(404).json({ message: `Hospital not found: ${hospitalName}` });
                }

                const doctors = await userModel.find(
                    {
                        role: "doctor",
                        hospitalId: hospital._id,
                        "metaData.doctorData.speciality": speciality,
                    },
                    { fullName: 1, _id: 0 }
                );
                if (!doctors.length) {
                    return res.status(404).json({
                        message: `No doctors found for specialty: ${speciality} in hospital: ${hospitalName}`,
                    });
                }
                return res.status(200).json({ doctors });
            }

            // Step 7: Fetch doctor details for a given doctor name and specialty
            if (country && state && city && hospitalName && speciality && doctor) {
                const hospital = await hospitalModel.findOne({ name: hospitalName, country, state, city });
                if (!hospital) {
                    return res.status(404).json({ message: `Hospital not found: ${hospitalName}` });
                }

                const doctorDetails = await userModel.findOne(
                    {
                        role: "doctor",
                        hospitalId: hospital._id,
                        "metaData.doctorData.speciality": speciality,
                        fullName: { $regex: new RegExp(doctor, "i") },
                    },
                    { fullName: 1, metaData: 1 }
                );
                if (!doctorDetails) {
                    return res.status(404).json({
                        message: `Doctor not found: ${doctor} with specialty: ${speciality}`,
                    });
                }
                return res.status(200).json({ doctorDetails });
            }

            res.status(400).json({ message: "Invalid query parameters." });
        } catch (error) {
            console.error("Error in search-options API:", error);
            res.status(500).json({ message: "Internal Server Error", error: error.message });
        }

    }

    async getseacrchingforappointment(req, res) {

        try {
            const { country, state, city, hospitalName, speciality, doctor } = req.query;

            // Filters to apply based on the query parameters
            const hospitalFilters = {};
            const doctorFilters = { role: "doctor" };

            if (country) hospitalFilters.country = country;
            if (state) hospitalFilters.state = state;
            if (city) hospitalFilters.city = city;
            if (hospitalName) hospitalFilters.name = hospitalName;

            if (speciality) doctorFilters["metaData.doctorData.speciality"] = speciality;
            if (doctor) doctorFilters.fullName = { $regex: new RegExp(doctor, "i") };

            // Step 1: Fetch possible options for each dropdown
            const countries = await hospitalModel.distinct("country", hospitalFilters);
            const states = await hospitalModel.distinct("state", hospitalFilters);
            const cities = await hospitalModel.distinct("city", hospitalFilters);
            const hospitals = await hospitalModel.distinct("name", hospitalFilters);

            let specialties = [];
            if (hospitalName || country || state || city) {
                const hospitalsMatchingFilters = await hospitalModel.find(hospitalFilters, { _id: 1 });
                const hospitalIds = hospitalsMatchingFilters.map((h) => h._id);
                specialties = await userModel.distinct("metaData.doctorData.speciality", {
                    ...doctorFilters,
                    hospitalId: { $in: hospitalIds },
                });
            } else {
                specialties = await userModel.distinct("metaData.doctorData.speciality", doctorFilters);
            }

            let doctors = [];
            if (speciality || hospitalName || country || state || city) {
                const hospitalsMatchingFilters = await hospitalModel.find(hospitalFilters, { _id: 1 });
                const hospitalIds = hospitalsMatchingFilters.map((h) => h._id);
                doctors = await userModel.find(
                    { ...doctorFilters, hospitalId: { $in: hospitalIds } },
                    { fullName: 1, _id: 0 }
                );
            } else {
                doctors = await userModel.find(doctorFilters, { fullName: 1, _id: 0 });
            }

            // Send response with all possible options
            res.status(200).json({
                countries,
                states,
                cities,
                hospitals,
                specialties,
                doctors: doctors.map((d) => d.fullName),
            });
        } catch (error) {
            console.error("Error in search-options API:", error);
            res.status(500).json({ message: "Internal Server Error", error: error.message });
        }

    }

}

export default AppointmentController;
