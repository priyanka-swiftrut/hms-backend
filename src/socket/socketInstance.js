import { Server } from "socket.io";
import Message from "../models/Message.model.js";
import cloudinary from '../config/cloudinaryConfig.js';


let io;
export let onlineUsers = {}; // Track users by socket ID
export let checkonline = {}


const init = (server) => {
    if (!io) {
        io = new Server(server, {
            cors: {
                origin: "*", // Replace with specific origin in production
                methods: ["GET", "POST"],  
            },
        });
        io.on("connection", (socket) => {
            console.log("New client connected:", socket.id);

            // Track the online user
            socket.on("register-user", (userId) => {
                if (!userId) {
                    console.warn(`Socket ${socket.id} tried to register without a userId`);
                    return;
                }
                onlineUsers[socket.id] = { socketId: socket.id, userId, isAvailable: true };
                checkonline[userId] = { socketId: socket.id, userId, isAvailable: true };
                console.log(`User ${userId} registered with socket ${socket.id}`);
                io.emit("update-online-users",{ onlineUsers , checkonline});
            });

            // Join chat rooms
            socket.on("join-chat", (roomId) => {
                if (!roomId) {
                    console.warn(`Socket ${socket.id} tried to join a chat room without roomId`);
                    return;
                }
                socket.join(`chat-${roomId}`);
                console.log(`Socket ${socket.id} joined chat room ${roomId}`);
            });

            // Handle sending messages
            // socket.on("send-message", async (data) => {
            //     const { to, from, message: text, roomId } = data;
                
            //     console.log(data, "----------------------------------------------------------------");
                
                

            //     // Validate required fields
            //     if (!to || !from || !text || !roomId) {
            //         console.warn(`Invalid message data received from socket ${socket.id}`);
            //         socket.emit("error", { message: "Invalid message data." });
            //         return;

            //     }
            
            //     // Validate ObjectId fields
            //     const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);
            //     if (!isValidObjectId(from) || !isValidObjectId(to)) {
            //         console.warn(`Invalid ObjectId(s): from=${from}, to=${to}`);
            //         socket.emit("error", { message: "Invalid user IDs provided." });
            //         return;
            //     }
            
            //     try {
            //         // Save the message
            //         const chat = new Message({ from, to, message: text, roomId });
            //         await chat.save();
            
            //         // Send message to the specific user in the room
            //         const recipientSocketId = Object.keys(onlineUsers).find(
            //             (id) => onlineUsers[id].userId === to
            //         );
            
            //         if (recipientSocketId) {
            //             io.to(recipientSocketId).emit("receive-message", {
            //                 from,
            //                 to,
            //                 message: text,
            //                 roomId,
            //             });
            //             console.log(`Message sent from ${from} to ${to} in room ${roomId}`);
            //         } else {
            //             console.log(`User ${to} is not online. Message not delivered.`);
            //         }
            //     } catch (error) {
            //         console.error("Error saving message:", error);
            //         socket.emit("error", { message: "Failed to send message. Please try again." });
            //     }
            // });

            socket.on("send-message", async (data, callback = () => {}) => {
            console.log(data);

                const { to, from, roomId, fileDetails , type:resource_type } = data; // Assuming file data is sent as `file`
                let message = data.message;

                if (!to || !from || !roomId) {
                    console.warn(`Invalid data received from socket ${socket.id}`);
                    callback({ error: "Missing required fields." });
                    return;
                }

                try {
                    // Validate required fields
                    if (!to || !from || !roomId || (!fileDetails && !message)) {
                        console.warn(`Invalid data received from socket ${socket.id}`);
                        callback({ error: "Missing required fields." });
                        return;
                    }
            
                    // If a file is provided, upload to Cloudinary
                    if (fileDetails) {  
                        
                        const { base64, type } = fileDetails;
                        console.log(type , "23hgfkjfjhgfjhgffghfhgfhgfh------------------ghjfgjfgjfgj-------------hjfgj-------");
                        const uploadResponse = await cloudinary.uploader.upload(`data:${type};base64,${base64}`, {
                            folder: "chatFiles",
                            resource_type: resource_type, 
                        });
                       

                        message = uploadResponse.secure_url; // Save Cloudinary file URL as message
                    }
            
                    // Save the message in the database
                    const chat = new Message({ from, to, message, roomId , type : resource_type });
                    await chat.save();
            
                    // Emit the message to the recipient
                    const recipientSocketId = Object.keys(onlineUsers).find(
                        (id) => onlineUsers[id].userId === to
                    );
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("receive-message", {
                            from,
                            to,
                            message,
                            roomId,
                        });
                    }
            
                    // Callback success response to the sender
                    callback({ success: true, message: "Message sent successfully." });
                } catch (error) {
                    console.error("Error handling file in socket message:", error);
                    callback({ error: "Failed to send message." });
                }
            });

          

            // Handle receiving messages
            socket.on("receive-message", (data) => {
                console.log(`Message received by user:`, data);
            });

            // i want to cheq user is online or not  
            // socket.on("check-online", (userId) => {
            //     const user = Object.values(onlineUsers).find((u) => u.userId === userId);
            //     console.log(user , "----------------------------------------");
            //     if (user) {
                   
            //     io.to(socket.id).emit("user-status", { online: true, user });
            //     } else {


            //     io.to(socket.id).emit("user-status", { online: false });
            //     }
            // });



            // Handle disconnection
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

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO has not been initialized. Please call init() first.");
    }
    return io;
};

// Get the status of a user (if they are available)
export const getUserAvailability = (socketId) => {
    return onlineUsers[socketId]?.isAvailable || false;
};

// Expose onlineUsers for external use
export const getOnlineUsers = () => onlineUsers;


export default { init, getIO, getUserAvailability, getOnlineUsers  };





