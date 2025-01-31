import Appointment from '../models/Appointment.model.js';
import Bill from '../models/Bill.model.js';
import hospitalModel from '../models/Hospital.model.js';
import userModel from '../models/User.model.js';
// import paymentModel from '../models/Payment.model.js';
import ResponseService from '../services/response.services.js';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.model.js';
import Insurance from '../models/Insurance.model.js';
import Holiday from '../models/holiday.model.js';
import moment from 'moment';
import sendNotification from '../services/notificationService.js';

class AppointmentController {
    
    async createAppointment(req, res) {
        try {
            console.log("hii-1");
            
            const { doctorId, date, appointmentTime, type, patient_issue, dieseas_name, city, state, country, paymentType, paymentStatus, insuranceDetails } = req.body;
            let { role, id: patientId } = req.user;

            if (role === "receptionist") {
                patientId = req.body.patientId;
            }
            console.log("hii-2");

            const doctor = await User.findById(doctorId);
            if (!doctor) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor not found.", 0);
            }

            if (role !== "receptionist" && paymentType === "cash" && type === "online") {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
            }

            if (!["onsite", "online"].includes(type)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid appointment type.", 0);
            }

            if (!["Cash", "Online", "Insurance"].includes(paymentType)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid payment type.", 0);
            }

            let isAppointment = false;
            if (appointmentTime) {
                const [isDoctorAppointment, isPatientAppointment] = await Promise.all([
                    Appointment.find({ doctorId, date, appointmentTime }),
                    Appointment.find({ patientId, date, appointmentTime })
                ]);

                isAppointment = isDoctorAppointment.length > 0 || isPatientAppointment.length > 0;
            }

            if (isAppointment) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment already exists.", 0);
            }

            const appointmentData = { patientId, doctorId, hospitalId: doctor.hospitalId, date, appointmentTime, type, patient_issue, dieseas_name, city, state, country, status: "scheduled" };
            const newAppointment = new Appointment(appointmentData);
            await newAppointment.save();

            if (paymentStatus || paymentType === "Cash" || paymentType === "Insurance") {
                const bill = await this.createBill(req, newAppointment, paymentType, type, insuranceDetails);
                if (!bill) {
                    return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Appointment booked but error generating bill.", 0);
                }

                await Promise.all([
                    sendNotification({
                        type: 'Appointment',
                        message: `Appointment Booked Successfully: ${newAppointment.date} at ${newAppointment.appointmentTime}`,
                        hospitalId: doctor.hospitalId,
                        targetUsers: patientId,
                    }),
                    sendNotification({
                        type: 'Appointment',
                        message: `You have a new Appointment on: ${newAppointment.date} at ${newAppointment.appointmentTime}`,
                        hospitalId: doctor.hospitalId,
                        targetUsers: doctorId,
                    })
                ]);

                return ResponseService.send(res, StatusCodes.CREATED, "Appointment and bill created successfully.", 1, { appointment: newAppointment, bill });
            }

            return ResponseService.send(res, StatusCodes.CREATED, "Appointment created successfully without a bill.", 1, { appointment: newAppointment });

        } catch (error) {
            console.error("Error creating appointment:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    // Method to create a bill for an appointment
    async createBill(req, appointment, paymentType, type, insuranceDetails) {
        try {
            const { doctorId, patientId, hospitalId, _id: appointmentId } = appointment;

            const doctor = await User.findById(doctorId);
            if (!doctor) throw new Error("Doctor not found.");

            if (req.user.role !== "receptionist" && paymentType === "cash" && type === "online") {
                throw new Error("Invalid payment type.");
            }

            let amount = type === "onsite" ? doctor.metaData.doctorData.consultationRate : doctor.metaData.doctorData.onlineConsultationRate;
            if (amount === undefined) throw new Error("Invalid appointment type.");

            const tax = amount * 0.18;
            const totalAmount = amount + tax;

            let insuranceId = null;
            let dueAmount = 0;

            if (paymentType === "Insurance") {
                const { insuranceCompany, insurancePlan, claimAmount, claimedAmount } = insuranceDetails || {};
                if (!insuranceCompany || !insurancePlan || claimAmount === undefined || claimedAmount === undefined) {
                    throw new Error("Incomplete insurance details.");
                }

                if (claimAmount < claimedAmount) throw new Error("Claim amount cannot be less than claimed amount.");

                const newInsurance = new Insurance({ patientId, insuranceCompany, insurancePlan, claimAmount, claimedAmount });
                const savedInsurance = await newInsurance.save();
                insuranceId = savedInsurance._id;

                if (claimedAmount < totalAmount) {
                    dueAmount = totalAmount - claimedAmount;
                }
            }

            const billData = {
                patientId, doctorId, hospitalId, appointmentId, type, paymentType, amount, tax, totalAmount, dueAmount, insuranceId, 
                date: new Date(), time: new Date().toLocaleTimeString(), status: true,
            };

            const newBill = new Bill(billData);
            await newBill.save();

            const populatedBill = await Bill.findById(newBill._id)
                .populate('patientId', 'fullName email gender age phone address')
                .populate('doctorId', 'fullName metadata.doctorData.specialization metadata.doctorData.description metadata.doctorData.onlineConsultationRate metadata.doctorData.consultationRate')
                .populate('appointmentId', 'date appointmentTime status dieseas_name');

            await sendNotification({
                type: 'Bill',
                message: `Bill Created Successfully: ${newBill.date} at ${newBill.time}`,
                hospitalId,
                targetUsers: patientId,
            });

            return populatedBill;
        } catch (error) {
            console.error("Error creating bill:", error);
            return null;
        }
    }
    

    async getAppointments(req, res) {
        try {
            if (!req.user.id) {
                return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
            }
    
            const { filter, date, startDate, endDate, page = 1, limit = 1500, patientId } = req.query;
            const paginationLimit = parseInt(limit, 1500);
            const paginationSkip = (parseInt(page, 10) - 1) * paginationLimit;
    
            const filters = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
    
            if (req.user.role === "doctor") {
                filters.doctorId = req.user.id;
            } else if (req.user.role === "patient") {
                filters.patientId = req.user.id;
            } else {
              
                if (patientId) {
                
                    filters.patientId = patientId;
                }
            
                if (req.user.hospitalId) {
                    filters.hospitalId = req.user.hospitalId;
                }
            }
    
           
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); 
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
                filters.status = { $ne: "canceled" };
            } else if (filter === "upcoming") {
                filters.date = { $gt: today };
                filters.status = { $ne: "canceled" };
            } else if (filter === "previous") {
                filters.date = { $lt: today };
                filters.status = { $ne: "canceled" };
            }
    
           
            if (filter === "cancel") {
                filters.status = "canceled";
            }
    
    
            const appointments = await Appointment.find(filters)
                .skip(paginationSkip)
                .limit(paginationLimit)
                .sort({ date: 1 }) 
                .populate("doctorId", "fullName profilePicture email profilePicture phone age gender address metaData.doctorData.speciality metaData.doctorData.description metaData.doctorData.experience metaData.doctorData.qualification metaData.doctorData.hospitalName metaData.doctorData.morningSession metaData.doctorData.eveningSession metaData.doctorData.emergencyContactNo")
                .populate("patientId", "fullName email ")
                .populate("hospitalId", "name emergencyContactNo");
    
      
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
            if (!req.user.id) {
                return ResponseService.send(res, StatusCodes.UNAUTHORIZED, "User not authorized", 0);
            }

            const { filter, page = 1, limit = 1500, type, specificDate, startDate, endDate } = req.query;
            const paginationLimit = parseInt(limit, 1500);
            const paginationSkip = (parseInt(page, 10) - 1) * paginationLimit;

            const filters = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            if (req.user.role === "doctor") {
                filters.doctorId = req.user.id;
            } else if (req.user.role === "patient") {
                filters.patientId = req.user.id;
            }

            if (filter === "today") {
                filters.date = { $gte: today, $lt: tomorrow };
                filters.status = { $ne: "canceled" };
            } else if (filter === "upcoming") {
                filters.date = { $gt: today };
                filters.status = { $ne: "canceled" };
            } else if (filter === "previous") {
                filters.date = { $lt: today };
                filters.status = { $ne: "canceled" };
            } else if (filter === "cancel") {
                filters.status = "canceled";
            }

            if (specificDate) {
                const specificDateObj = new Date(specificDate);
                if (isNaN(specificDateObj.getTime())) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid specific date format", 0);
                }
                const specificStartOfDay = new Date(specificDateObj.setHours(0, 0, 0, 0));
                const specificEndOfDay = new Date(specificDateObj.setHours(23, 59, 59, 999));
                filters.date = { $gte: specificStartOfDay, $lte: specificEndOfDay };
            }

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid start or end date format", 0);
                }
                filters.date = { $gte: start, $lte: end };
            }

            if (type === "onsite" || type === "online") {
                filters.type = type;
            }

            const appointments = await Appointment.find(filters)
                .skip(paginationSkip)
                .limit(paginationLimit)
                .sort({ date: 1 }) 
                .populate("doctorId", "fullName email profilePicture phone age gender address metaData.doctorData.speciality metaData.doctorData.description metaData.doctorData.experience metaData.doctorData.qualification metaData.doctorData.hospitalName metadata.doctorData.morningSession metaData.doctorData.eveningSession")
                .populate("patientId", "fullName email")
                .populate("hospitalId", "name");

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

        
            if (appointment.patientId && appointment.patientId.address) {
                const address = appointment.patientId.address;
                const formattedAddress = `${address.fullAddress}, ${address.city}, ${address.state}, ${address.country}, ${address.zipCode}`;
                appointment.patientId.formattedAddress = formattedAddress;
            }

            if (appointment.date) {
                appointment.formattedDate = new Date(appointment.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }); 
            }

            return ResponseService.send(res, StatusCodes.OK, "Appointment fetched successfully", 1, {
                appointment: {
                    ...appointment.toObject(),
                    patientId: {
                        ...appointment.patientId.toObject(),
                        address: appointment.patientId.formattedAddress, 
                    },
                    date: appointment.formattedDate, 
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
            const { doctorId, patientId, date, appointmentTime, patient_issue, dieseas_name, city, state, country, status } = req.body;
    
            const appointment = await Appointment.findById(id);
            if (!appointment) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment not found.", 0);
            }
    
            if (req.user.role !== "receptionist" && (doctorId || patientId)) {
                return ResponseService.send(res, StatusCodes.FORBIDDEN, "You do not have permission to update sensitive fields like doctorId or patientId.", 0);
            }
    
            if (doctorId || patientId || date || appointmentTime) {
                const conflictQuery = {
                    $or: [
                        { doctorId: doctorId || appointment.doctorId, date: date || appointment.date, appointmentTime: appointmentTime || appointment.appointmentTime },
                        { patientId: patientId || appointment.patientId, date: date || appointment.date, appointmentTime: appointmentTime || appointment.appointmentTime }
                    ],
                    _id: { $ne: id }
                };
    
                const conflict = await Appointment.findOne(conflictQuery);
                if (conflict) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Another appointment already exists at the given time.", 0);
                }
            }
    
            const allowedStatuses = ["scheduled", "canceled", "pending", "completed", "checkin", "checkout"];
            if (status && !allowedStatuses.includes(status)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, `Invalid status. Allowed statuses are: ${allowedStatuses.join(", ")}.`, 0);
            }
    
            const updateData = {
                ...(doctorId && { doctorId }),
                ...(patientId && { patientId }),
                ...(date && { date }),
                ...(appointmentTime && { appointmentTime }),
                ...(patient_issue !== undefined && { patient_issue }),
                ...(dieseas_name !== undefined && { dieseas_name }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(country !== undefined && { country }),
                ...(status && { status })
            };
    
            const updatedAppointment = await Appointment.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
            if (!updatedAppointment) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Failed to update appointment.", 0);
            }
    
            // Notification Logic
            const { role, hospitalId } = req.user;
            const { doctorId: currentDoctorId, patientId: currentPatientId } = appointment;
    
            if (role === "doctor") {
                // Doctor changed date/time
                if (date || appointmentTime) {
                    await sendNotification({
                        type: "Appointment",
                        message: `Your appointment has been rescheduled by the doctor to ${updatedAppointment.date} at ${updatedAppointment.appointmentTime}.`,
                        hospitalId,
                        targetUsers: currentPatientId
                    });
                }
                // Doctor changed status
                if (status) {
                    await sendNotification({
                        type: "Appointment",
                        message: `Your appointment on ${appointment.date} at ${appointment.appointmentTime} has been ${status} by the doctor.`,
                        hospitalId,
                        targetUsers: currentPatientId
                    });
                }
            }
    
            if (role === "patient") {
                // Patient changed date/time
                if (date || appointmentTime) {
                    await sendNotification({
                        type: "Appointment",
                        message: `The appointment with the doctor has been rescheduled by the patient to ${updatedAppointment.date} at ${updatedAppointment.appointmentTime}.`,
                        hospitalId: appointment.hospitalId,
                        targetUsers: currentDoctorId
                    });
                }
                // Patient changed status
                if (status) {
                    await sendNotification({
                        type: "Appointment",
                        message: `The appointment on ${appointment.date} at ${appointment.appointmentTime} has been ${status} by the patient.`,
                        hospitalId: appointment.hospitalId,
                        targetUsers: currentDoctorId
                    });
                }
            }
    
            return ResponseService.send(res, StatusCodes.OK, "Appointment updated successfully", 1, { appointment: updatedAppointment });
        } catch (error) {
            console.error("Error updating appointment:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
}


async getDoctorSession(req, res) {
    try {
        const doctorId = req.params.doctorId || req.user?.id;
        if (!doctorId) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Doctor ID is required.", 0);
        }

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

        const parseSession = sessionString => {
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

        const holidays = await Holiday.findOne({
            userId: doctorId,
            date: targetDate
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

        const applyHolidayFilter = (morningSlots, eveningSlots, holiday) => {
            if (!holiday) return;

            switch (holiday.session) {
                case "morning":
                    morningSlots.forEach(slot => (slot.available = false));
                    break;
                case "evening":
                    eveningSlots.forEach(slot => (slot.available = false));
                    break;
                case "full_day":
                    morningSlots.forEach(slot => (slot.available = false));
                    eveningSlots.forEach(slot => (slot.available = false));
                    break;
            }
        };

        checkAvailability(morningSlots, appointments);
        checkAvailability(eveningSlots, appointments);
        applyHolidayFilter(morningSlots, eveningSlots, holidays);

        const data = {
            morningSlots,
            eveningSlots
        };

        return ResponseService.send(res, StatusCodes.OK, "Data fetched successfully", 1, data);
    } catch (error) {
        console.error("Error in getDoctorSession:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
}

    
async getAppointmentsWithoutBills(req, res) {
    try {
        const { hospitalId } = req.user;

        // Fetch all appointment IDs present in bills
        const billedAppointmentIds = await Bill.find({ hospitalId }).distinct("appointmentId");

        // Fetch appointments not in the billed list and matching the hospitalId
        const appointmentsWithoutBills = await Appointment.find({
            hospitalId,
            _id: { $nin: billedAppointmentIds },
        })
            .populate("doctorId", "fullName")
            .populate("patientId", "fullName")
            .select("date appointmentTime doctorId patientId id");

        // Format the output
        const result = appointmentsWithoutBills.map(({ doctorId, patientId, appointmentTime, date, id }) => ({
            doctorData: doctorId,
            patientData: patientId,
            appointmentTime,
            date: new Date(date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }),
            id,
        }));

        return ResponseService.send(res, StatusCodes.OK, "Appointments without bills fetched successfully", 1, result);
    } catch (error) {
        console.error("Error fetching appointments without bills:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching appointments without bills", 0);
    }
}

async getSearchingForAppointment(req, res) {
    try {
        const hospitals = await hospitalModel.find({}, { _id: 1, country: 1, state: 1, city: 1, name: 1 });
        const doctors = await userModel.find({ role: "doctor" }, {
            fullName: 1,
            "metaData.doctorData.speciality": 1,
            hospitalId: 1,
            _id: 1,
        }).lean();

        // Create a map of doctors grouped by hospitalId
        const doctorMap = doctors.reduce((map, { hospitalId, fullName, _id, metaData }) => {
            if (!map[hospitalId]) {
                map[hospitalId] = [];
            }
            map[hospitalId].push({
                name: fullName,
                id: _id,
                speciality: metaData?.doctorData?.speciality || "Speciality not found",
            });
            return map;
        }, {});

        // Create a hierarchical structure for hospitals grouped by country, state, and city
        const countryMap = hospitals.reduce((map, { country, state, city, name: hospitalName, _id }) => {
            if (!map[country]) map[country] = {};
            if (!map[country][state]) map[country][state] = {};
            if (!map[country][state][city]) map[country][state][city] = [];

            const hospitalData = {
                name: hospitalName,
                specialties: [],
            };

            if (doctorMap[_id]) {
                const specialtiesMap = doctorMap[_id].reduce((specialties, { speciality, name, id }) => {
                    if (!specialties[speciality]) specialties[speciality] = [];
                    specialties[speciality].push({ name, id });
                    return specialties;
                }, {});

                hospitalData.specialties = Object.entries(specialtiesMap).map(([speciality, doctors]) => ({
                    speciality,
                    doctors,
                }));
            }

            map[country][state][city].push(hospitalData);
            return map;
        }, {});

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

        return ResponseService.send(res, StatusCodes.OK, "Data fetched successfully", 1, result);
    } catch (error) {
        console.error("Error in hierarchical data API:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
}

async chatContext(req, res) {
    try {
        const { id, role } = req.user;

        if (role === "patient") {
            // Fetch unique doctors the patient has appointments with
            const appointments = await Appointment.find({ patientId: id })
                .populate("doctorId", "fullName profilePicture")
                .select("doctorId");

            const uniqueDoctors = appointments.reduce((acc, { doctorId }) => {
                if (!acc.some(doctor => doctor._id.toString() === doctorId._id.toString())) {
                    acc.push(doctorId);
                }
                return acc;
            }, []);

            return ResponseService.send(res, StatusCodes.OK, "Data fetched successfully", 1, uniqueDoctors);

        } else if (role === "doctor") {
            // Fetch unique patients the doctor has appointments with
            const appointments = await Appointment.find({ doctorId: id })
                .populate("patientId", "fullName profilePicture")
                .select("patientId");

            const uniquePatients = appointments.reduce((acc, { patientId }) => {
                if (!acc.some(patient => patient._id.toString() === patientId._id.toString())) {
                    acc.push(patientId);
                }
                return acc;
            }, []);

            return ResponseService.send(res, StatusCodes.OK, "Data fetched successfully", 1, uniquePatients);
        } else {
            return ResponseService.send(res, StatusCodes.FORBIDDEN, "Access denied. Only patients and doctors can access this endpoint.", 0);
        }
    } catch (error) {
        console.error("Error fetching chat connections:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
}
  
}

export default AppointmentController;
