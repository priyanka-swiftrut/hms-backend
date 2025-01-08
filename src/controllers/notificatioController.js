import Notification from "../models/Notification.model.js";
import sendNotification from "../services/notificationService.js";

// Controller to create a new notification
    export const createNotification = async (req, res) => {
    try {
        const { type, message, hospitalId, targetUsers } = req.body;

        if (!type || !message || !hospitalId || !targetUsers) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const notification = await sendNotification({ type, message, hospitalId, targetUsers });

        res.status(201).json({ success: true, notification });
    } catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json({ error: "Failed to create notification." });
    }
};

// Controller to get notifications for a user
export const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required." });
        }

        const notifications = await Notification.find({ targetUsers: userId })
            .sort({ createdAt: -1 })
            .exec();

        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
};

// Controller to mark a notification as read
export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        if (!notificationId) {
            return res.status(400).json({ error: "Notification ID is required." });
        }

        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: "Notification not found." });
        }

        res.status(200).json({ success: true, notification });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: "Failed to mark notification as read." });
    }
};


                

