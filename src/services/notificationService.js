import socketInstance from '../socket/socketInstance.js';
import Notification from '../models/Notification.model.js';


const sendNotification = async ({ type, message, hospitalId, targetUsers }) => {
    try {
        if (!hospitalId) {
            console.error("Invalid hospitalId provided for notification emission.");
            return;
        }
        const newNotification = new Notification({ type, message, hospitalId, targetUsers });
        await newNotification.save();
        
        const io = socketInstance.getIO();
        if (io) {
            try {
                io.to(`hospital-${hospitalId}`).emit("new-notification", {
                    type,
                    message,
                    hospitalId,
                    targetUsers,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error(
                    `Error emitting notification to hospital-${hospitalId}:`,
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