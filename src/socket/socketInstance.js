// import { Server } from "socket.io";
// import Message from "../models/Message.model.js";
// import cloudinary from '../config/cloudinaryConfig.js';


// let io;
// let onlineUsers = {}; // Track users by socket ID
// let checkonline = {}

// const init = (server) => {
//     if (!io) {
//         io = new Server(server, {
//             cors: {
//                 origin: "*", // Replace with specific origin in production
//                 methods: ["GET", "POST"],
//             },
//         });
//         io.on("connection", (socket) => {
//             console.log("New client connected:", socket.id);

//             // Track the online user
//             socket.on("register-user", (userId) => {
//                 if (!userId) {
//                     console.warn(`Socket ${socket.id} tried to register without a userId`);
//                     return;
//                 }
//                 onlineUsers[socket.id] = { socketId: socket.id, userId, isAvailable: true };
//                 checkonline[userId] = { socketId: socket.id, userId, isAvailable: true };
//                 console.log(`User ${userId} registered with socket ${socket.id}`);
//                 io.emit("update-online-users",{ onlineUsers , checkonline});
//             });

//             // Join chat rooms
//             socket.on("join-chat", (roomId) => {
//                 if (!roomId) {
//                     console.warn(`Socket ${socket.id} tried to join a chat room without roomId`);
//                     return;
//                 }
//                 socket.join(`chat-${roomId}`);
//                 console.log(`Socket ${socket.id} joined chat room ${roomId}`);
//             });

//             // Handle sending messages
//             // socket.on("send-message", async (data) => {
//             //     const { to, from, message: text, roomId } = data;
                
//             //     console.log(data, "----------------------------------------------------------------");
                
                

//             //     // Validate required fields
//             //     if (!to || !from || !text || !roomId) {
//             //         console.warn(`Invalid message data received from socket ${socket.id}`);
//             //         socket.emit("error", { message: "Invalid message data." });
//             //         return;

//             //     }
            
//             //     // Validate ObjectId fields
//             //     const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);
//             //     if (!isValidObjectId(from) || !isValidObjectId(to)) {
//             //         console.warn(`Invalid ObjectId(s): from=${from}, to=${to}`);
//             //         socket.emit("error", { message: "Invalid user IDs provided." });
//             //         return;
//             //     }
            
//             //     try {
//             //         // Save the message
//             //         const chat = new Message({ from, to, message: text, roomId });
//             //         await chat.save();
            
//             //         // Send message to the specific user in the room
//             //         const recipientSocketId = Object.keys(onlineUsers).find(
//             //             (id) => onlineUsers[id].userId === to
//             //         );
            
//             //         if (recipientSocketId) {
//             //             io.to(recipientSocketId).emit("receive-message", {
//             //                 from,
//             //                 to,
//             //                 message: text,
//             //                 roomId,
//             //             });
//             //             console.log(`Message sent from ${from} to ${to} in room ${roomId}`);
//             //         } else {
//             //             console.log(`User ${to} is not online. Message not delivered.`);
//             //         }
//             //     } catch (error) {
//             //         console.error("Error saving message:", error);
//             //         socket.emit("error", { message: "Failed to send message. Please try again." });
//             //     }
//             // });

//             // socket.on("send-message", async (data, callback = () => {}) => {
//             //     const { to, from, roomId, file } = data; // Assuming file data is sent as `file`
//             //     let message = data.message;
            
//             //     try {
//             //         // Validate required fields
//             //         if (!to || !from || !roomId || (!file && !message)) {
//             //             console.warn(`Invalid data received from socket ${socket.id}`);
//             //             callback({ error: "Missing required fields." });
//             //             return;
//             //         }
            
//             //         // If a file is provided, upload to Cloudinary
//             //         if (file) {
//             //             const uploadedFile = await cloudinary.uploader.upload(file, {
//             //                 folder: "chatFiles",
//             //                 resource_type: "auto", // Automatically detect file type
//             //             });
//             //             message = uploadedFile.secure_url; // Save Cloudinary file URL as message
//             //         }
            
//             //         // Save the message in the database
//             //         const chat = new Message({ from, to, message, roomId });
//             //         await chat.save();
            
//             //         // Emit the message to the recipient
//             //         const recipientSocketId = Object.keys(onlineUsers).find(
//             //             (id) => onlineUsers[id].userId === to
//             //         );
//             //         if (recipientSocketId) {
//             //             io.to(recipientSocketId).emit("receive-message", {
//             //                 from,
//             //                 to,
//             //                 message,
//             //                 roomId,
//             //             });
//             //         }
            
//             //         // Callback success response to the sender
//             //         callback({ success: true, message: "Message sent successfully." });
//             //     } catch (error) {
//             //         console.error("Error handling file in socket message:", error);
//             //         callback({ error: "Failed to send message." });
//             //     }
//             // });

//             socket.on("send-message", async (data, callback = () => {}) => {
//                 const { to, from, roomId, file } = data; // file is expected to be base64
//                 let message = data.message;
              
//                 try {
//                   // Validate required fields
//                   if (!to || !from || !roomId || (!file && !message)) {
//                     console.warn(`Invalid data received from socket ${socket.id}`);
//                     callback({ error: "Missing required fields." });
//                     return;
//                   }
              
//                   // If a base64 file is provided, directly use it
//                   if (file) {
//                     message = file; // Base64 data is directly assigned to message
//                   }
              
//                   // Save the message in the database
//                   const chat = new Message({ from, to, message, roomId });
//                   await chat.save();
              
//                   // Emit the message to the recipient
//                   const recipientSocketId = Object.keys(onlineUsers).find(
//                     (id) => onlineUsers[id].userId === to
//                   );
//                   if (recipientSocketId) {
//                     io.to(recipientSocketId).emit("receive-message", {
//                       from,
//                       to,
//                       message,
//                       roomId,
//                     });
//                   }
              
//                   // Callback success response to the sender
//                   callback({ success: true, message: "Message sent successfully." });
//                 } catch (error) {
//                   console.error("Error handling file in socket message:", error);
//                   callback({ error: "Failed to send message." });
//                 }
//               });
              

//             // Handle receiving messages
//             socket.on("receive-message", (data) => {
//                 console.log(`Message received by user:`, data);
//             });

//             // i want to cheq user is online or not  
//             // socket.on("check-online", (userId) => {
//             //     const user = Object.values(onlineUsers).find((u) => u.userId === userId);
//             //     console.log(user , "----------------------------------------");
//             //     if (user) {
                   
//             //     io.to(socket.id).emit("user-status", { online: true, user });
//             //     } else {


//             //     io.to(socket.id).emit("user-status", { online: false });
//             //     }
//             // });



//             // Handle disconnection
//             socket.on("disconnect", () => {
//                 console.log("Client disconnected:", socket.id);
//                 delete onlineUsers[socket.id];
//                 io.emit("update-online-users", onlineUsers);
//             });
//         });
//     }

//     console.log("Socket.IO initialized");
//     return io;
// };

// export const getIO = () => {
//     if (!io) {
//         throw new Error("Socket.IO has not been initialized. Please call init() first.");
//     }
//     return io;
// };

// // Get the status of a user (if they are available)
// export const getUserAvailability = (socketId) => {
//     return onlineUsers[socketId]?.isAvailable || false;
// };

// // Expose onlineUsers for external use
// export const getOnlineUsers = () => onlineUsers;


// export default { init, getIO, getUserAvailability, getOnlineUsers };



// socketInstance.js

import { Server } from "socket.io";
import Message from "../models/Message.model.js";
import cloudinary from '../config/cloudinaryConfig.js';

let io;
let onlineUsers = {}; 

const init = (server) => {
    if (!io) {
        io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        io.on("connection", (socket) => {
            console.log("New client connected:", socket.id);

            socket.on("register-user", (userId) => {
                if (!userId) {
                    console.warn(`Socket ${socket.id} tried to register without a userId`);
                    return;
                }
                onlineUsers[socket.id] = { socketId: socket.id, userId, isAvailable: true };
                console.log(`User ${userId} registered with socket ${socket.id}`);
                io.emit("update-online-users", onlineUsers);
            });

            socket.on("send-message", async (data, callback = () => {}) => {
                const { to, from, roomId, fileDetails } = data; 
                let message = data.message;
                console.log(data , "----------------------------------------");
                
                try {   
                    if (!to || !from || !roomId || (!fileDetails && !message)) {
                        console.warn(`Invalid data received from socket ${socket.id}`);
                        callback({ error: "Missing required fields." });
                        return;
                    }

                    if (fileDetails) {
                        // Check if the file is base64 encoded and upload to Cloudinary
                        const uploadedFile = await cloudinary.uploader.upload(fileDetails.base64, {
                            folder: 'chatFiles',
                            resource_type: 'auto', 
                        });
                        message = uploadedFile.secure_url; 
                    }

                    const chat = new Message({ from, to, message, roomId });
                    await chat.save();

                    const recipientSocketId = Object.keys(onlineUsers).find((id) => onlineUsers[id].userId === to);
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("receive-message", {
                            from,
                            to,
                            message,
                            roomId,
                        });
                    }

                    callback({ success: true, message: "Message sent successfully." });
                } catch (error) {
                    console.error("Error handling file in socket message:", error);
                    callback({ error: "Failed to send message." });
                }
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
                delete onlineUsers[socket.id];
                io.emit("update-online-users", onlineUsers);
            });
        });
    }

    console.log("Socket.IO initialized");
    return io;
};

export default { init };
