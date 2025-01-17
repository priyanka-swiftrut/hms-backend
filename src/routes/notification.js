import express from "express";
import { createNotification, getNotifications, markAsRead } from "../controllers/notificatioController.js";

const router = express.Router();

// Route to create a new notification
router.post("/create", createNotification);

// Route to fetch notifications for a user
router.get("/user/:userId", getNotifications);

// Route to mark a notification as read
router.put("/mark-read/:notificationId", markAsRead);

export default router;