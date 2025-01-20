import { StatusCodes } from 'http-status-codes';
import holidayModel from '../models/holiday.model.js';
import ResponseService from '../services/response.services.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';

class HolidayController {

    // Create a new holiday
    async createHoliday(req, res) {
        try {
            const { hospitalId, id: userId } = req.user;

            if (!hospitalId || !userId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User or Hospital ID is missing", 0);
            }

            const userdata = await User.findOne({ _id: userId, hospitalId, isActive: true });

            if (!userdata) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "User not found or inactive", 0);
            }

            const { date, session, reason } = req.body;

            if (!date || !session || !reason) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "All fields (date, session, reason) are required", 0);
            }

            if (!["morning", "evening", "full_day"].includes(session)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid session value", 0);
            }

            const existingHoliday = await holidayModel.findOne({ date, userId });

            if (existingHoliday) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Holiday for this date already exists", 0);
            }

            const holiday = new holidayModel({ userId, hospitalId, date, session, reason });
            await holiday.save();

            return ResponseService.send(res, StatusCodes.OK, "Holiday created successfully", 1, holiday);
        } catch (error) {
            console.error("Error in createHoliday:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error creating holiday", 0);
        }
    }

    // Fetch holidays
    async getHolidays(req, res) {
        try {
            const { hospitalId, id: userId } = req.user;
            const { holidayId } = req.query;

            if (!hospitalId) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Hospital ID is required", 0);
            }

            if (holidayId) {
                if (!mongoose.Types.ObjectId.isValid(holidayId)) {
                    return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid holiday ID", 0);
                }

                const holiday = await holidayModel.findById(holidayId).populate("userId", "fullName email");

                if (!holiday) {
                    return ResponseService.send(res, StatusCodes.NOT_FOUND, "Holiday not found", 0);
                }

                return ResponseService.send(res, StatusCodes.OK, "Holiday fetched successfully", 1, holiday);
            }

            const holidays = await holidayModel.find({ hospitalId, userId }).populate("userId", "fullName email");

            if (holidays.length === 0) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "No holidays found", 0);
            }

            return ResponseService.send(res, StatusCodes.OK, "Holidays fetched successfully", 1, holidays);
        } catch (error) {
            console.error("Error in getHolidays:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching holidays", 0);
        }
    }

    // Update an existing holiday
    async updateHoliday(req, res) {
        try {
            const { holidayId } = req.params;
            const { date, session, reason } = req.body;

            if (!mongoose.Types.ObjectId.isValid(holidayId)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid holiday ID", 0);
            }

            const holiday = await holidayModel.findById(holidayId);

            if (!holiday) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Holiday not found", 0);
            }

            if (session && !["morning", "evening", "full_day"].includes(session)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid session value", 0);
            }

            if (date) holiday.date = date;
            if (session) holiday.session = session;
            if (reason) holiday.reason = reason;

            await holiday.save();

            return ResponseService.send(res, StatusCodes.OK, "Holiday updated successfully", 1, holiday);
        } catch (error) {
            console.error("Error in updateHoliday:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error updating holiday", 0);
        }
    }

    // Delete a holiday
    async deleteHoliday(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Invalid holiday ID", 0);
            }

            const holiday = await holidayModel.findById(id);

            if (!holiday) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "Holiday not found", 0);
            }

            await holiday.deleteOne();

            return ResponseService.send(res, StatusCodes.OK, "Holiday deleted successfully", 1);
        } catch (error) {
            console.error("Error in deleteHoliday:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, "Error deleting holiday", 0);
        }
    }
}

export default HolidayController;
