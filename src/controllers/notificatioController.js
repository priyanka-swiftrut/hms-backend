import { StatusCodes } from "http-status-codes";
import Notification from "../models/Notification.model.js";
import sendNotification from "../services/notificationService.js";
import ResponseService from "../services/response.services.js";

// Controller to create a new notification
export const createNotification = async (req, res) => {
    try {
        const { type, message, hospitalId, targetUsers } = req.body;

        if (!type || !message || !hospitalId || !targetUsers) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "All fields are required.", 0);
        }

        const notification = await sendNotification({ type, message, hospitalId, targetUsers });

        return ResponseService.send(res, StatusCodes.OK, "Data fetched Succesfully", 1, notification);
    } catch (error) {
        console.error("Error creating notification:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
};

// Controller to get notifications for a user
export const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User ID is required.", 0);
        }

        const notifications = await Notification.find({ targetUsers: userId })
            .sort({ createdAt: -1 })
            .limit(15)
            .exec();

            if (!notifications) {
                return ResponseService.send(res, StatusCodes.NOT_FOUND, "No notifications found.", 0);
            }

        return ResponseService.send(res, StatusCodes.OK, "Data fetched Succesfully", 1, notificationss);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
};


// Controller to mark a notification as read
export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        if (!notificationId) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Notification ID is required.", 0);
        }

        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return ResponseService.send(res, StatusCodes.NOT_FOUND, "Notification not found.", 0);
        }

        return ResponseService.send(res, StatusCodes.OK, "Data fetched Succesfully", 1, notification);
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
};




