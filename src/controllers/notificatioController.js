import { StatusCodes } from "http-status-codes";
import Notification from "../models/Notification.model.js";
import sendNotification from "../services/notificationService.js";
import ResponseService from "../services/response.services.js";

export const createNotification = async (req, res) => {
    try {
        const { type, message, hospitalId, targetUsers } = req.body;

        // Validate input fields
        if (!type || !message || !hospitalId || !targetUsers) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "All fields are required.", 0);
        }

        // Call service to send notification
        const notification = await sendNotification({ type, message, hospitalId, targetUsers });

        return ResponseService.send(res, StatusCodes.OK, "Notification created successfully", 1, notification);
    } catch (error) {
        console.error("Error creating notification:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
};

export const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate input
        if (!userId) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "User ID is required.", 0);
        }

        // Fetch notifications for the user
        const notifications = await Notification.find({ targetUsers: userId })
            .sort({ createdAt: -1 })
            .limit(15)
            .exec();

        // If no notifications are found
        if (!notifications?.length) {
            return ResponseService.send(res, StatusCodes.NOT_FOUND, "No notifications found.", 0);
        }

        return ResponseService.send(res, StatusCodes.OK, "Notifications fetched successfully", 1, notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        // Validate input
        if (!notificationId) {
            return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Notification ID is required.", 0);
        }

        // Update notification status to read
        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );

        // If notification not found
        if (!notification) {
            return ResponseService.send(res, StatusCodes.NOT_FOUND, "Notification not found.", 0);
        }

        return ResponseService.send(res, StatusCodes.OK, "Notification marked as read", 1, notification);
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
};
