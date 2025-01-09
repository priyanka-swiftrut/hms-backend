// import socketInstance from '../socket/socketInstance.js';
// import Notification from '../models/Notification.model.js';
// import {onlineUsers , checkonline} from "../socket/socketInstance.js"
// console.log(onlineUsers , checkonline , "------------------------------------------");

// const sendNotification = async ({ type, message, hospitalId, targetUsers }) => {
//     try {
//         if (!hospitalId) {
//             console.error("Invalid hospitalId provided for notification emission.");
//             return;
//         }
//         const newNotification = new Notification({ type, message, hospitalId, targetUsers });
//         await newNotification.save();
        
//         const io = socketInstance.getIO();
//         if (io) {
//             try {
//                 io.to(`hospital-${hospitalId}`).emit("new-notification", {
//                     type,
//                     message,
//                     hospitalId,
//                     targetUsers,
//                     timestamp: new Date(),
//                 });
//             } catch (error) {
//                 console.error(
//                     `Error emitting notification to hospital-${hospitalId}:`,
//                     error
//                 );
//             }
//         } else {
//             console.warn("Socket.IO instance is not initialized.");
//         }

//         return newNotification;
//     } catch (error) {
//         console.error("Error sending notification:", error);
//         throw error;
//     }
// };

// export default sendNotification;

import socketInstance from '../socket/socketInstance.js';
import Notification from '../models/Notification.model.js';
import { onlineUsers, checkonline } from "../socket/socketInstance.js";

const sendNotification = async ({ type, message, hospitalId, targetUsers }) => {
    try {
        if (!hospitalId) {
            console.error("Invalid hospitalId provided for notification emission.");
            return;
        }

        // Ensure targetUsers is always an array
        const userArray = Array.isArray(targetUsers) 
            ? targetUsers 
            : targetUsers ? [targetUsers] : [];

        // Create and save the notification
        const newNotification = new Notification({ 
            type, 
            message, 
            hospitalId, 
            targetUsers: userArray 
        });
        await newNotification.save();
        
        const io = socketInstance.getIO();
        if (io) {
            try {
                // Send to hospital room for general tracking
                io.to(`hospital-${hospitalId}`).emit("new-notification", {
                    type,
                    message,
                    hospitalId,
                    targetUsers: userArray,
                    timestamp: new Date(),
                });

                // Send to specific online users
                userArray.forEach(userId => {
                    // Convert ObjectId to string if necessary
                    const userIdString = userId.toString();
                    const userOnlineStatus = checkonline[userIdString];
                    
                    if (userOnlineStatus && userOnlineStatus.socketId) {
                        console.log(`Sending notification to user ${userIdString} via socket ${userOnlineStatus.socketId}`);
                        io.to(userOnlineStatus.socketId).emit("new-notification", {
                            type,
                            message,
                            hospitalId,
                            notificationId: newNotification._id,
                            timestamp: new Date(),
                        });
                    } else {
                        console.log(`User ${userIdString} is not online`);
                    }
                });
            } catch (error) {
                console.error(
                    `Error emitting notification:`,
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