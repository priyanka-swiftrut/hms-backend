import socketInstance from '../socket/socketInstance.js';
import Notification from '../models/Notification.model.js';


const sendNotification = async ({ type, message, societyId, targetUsers }) => {
    try {
        if (!societyId) {
            console.error("Invalid societyId provided for notification emission.");
            return;
        }
        const newNotification = new Notification({ type, message, societyId, targetUsers });
        await newNotification.save();
        
        const io = socketInstance.getIO();
        if (io) {
            try {
                io.to(`society-${societyId}`).emit("new-notification", {
                    type,
                    message,
                    societyId,
                    targetUsers,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error(
                    `Error emitting notification to society-${societyId}:`,
                    error
                );
            }
        } else {
            console.warn("Socket.IO instance is not initialized.");
        }

        return newNotification;
    } catch (error) {
        console.error("Error sending notification:", error);
        throw error;
    }
};

export default sendNotification;