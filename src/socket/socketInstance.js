import { Server } from "socket.io";
import Message from "../models/Message.model.js";

let io;
let onlineUsers = {}; // Track users by socket ID
let checkonline = {}

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
            socket.on("send-message", async (data) => {
                const { to, from, message: text, roomId } = data;
            
                // Validate required fields
                if (!to || !from || !text || !roomId) {
                    console.warn(`Invalid message data received from socket ${socket.id}`);
                    socket.emit("error", { message: "Invalid message data." });
                    return;
                }
            
                // Validate ObjectId fields
                const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);
                if (!isValidObjectId(from) || !isValidObjectId(to)) {
                    console.warn(`Invalid ObjectId(s): from=${from}, to=${to}`);
                    socket.emit("error", { message: "Invalid user IDs provided." });
                    return;
                }
            
                try {
                    // Save the message
                    const chat = new Message({ from, to, message: text, roomId });
                    await chat.save();
            
                    // Send message to the specific user in the room
                    const recipientSocketId = Object.keys(onlineUsers).find(
                        (id) => onlineUsers[id].userId === to
                    );
            
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("receive-message", {
                            from,
                            to,
                            message: text,
                            roomId,
                        });
                        console.log(`Message sent from ${from} to ${to} in room ${roomId}`);
                    } else {
                        console.log(`User ${to} is not online. Message not delivered.`);
                    }
                } catch (error) {
                    console.error("Error saving message:", error);
                    socket.emit("error", { message: "Failed to send message. Please try again." });
                }
            });

            // Handle receiving messages
            socket.on("receive-message", (data) => {
                console.log(`Message received by user:`, data);
            });

            // i want to cheq user is online or not  
            socket.on("check-online", (userId) => {

                const user = checkonline[userId];
                if (user) {
                    io.to(socket.id).emit("user-status", { online: true, user });
                    console.log(`User ${userId} is online.`);
                } else {
                    io.to(socket.id).emit("user-status", { online: false });
                    console.log(`User ${userId} is offline.`);
                }
            });

            

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


export default { init, getIO, getUserAvailability, getOnlineUsers };