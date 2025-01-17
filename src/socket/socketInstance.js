import { Server } from "socket.io";
import Message from "../models/Message.model.js";
import cloudinary from '../config/cloudinaryConfig.js';


let io;
export let onlineUsers = {}; 
export let checkonline = {}
const chatRooms = new Map();


const init = (server) => {
    if (!io) {
        io = new Server(server, {
            cors: {
                origin: "*", 
                methods: ["GET", "POST"],  
            },
        });
        io.on("connection", (socket) => {
            // Track the online user
            socket.on("register-user", (userId) => {
                if (!userId) {
                    console.warn(`Socket ${socket.id} tried to register without a userId`);
                    return;
                }
                onlineUsers[socket.id] = { socketId: socket.id, userId, isAvailable: true };
                checkonline[userId] = { socketId: socket.id, userId, isAvailable: true };
                io.emit("update-online-users",{ onlineUsers , checkonline});
            });

            // Join chat rooms
            socket.on("join-chat", (roomId) => {
                if (!roomId || !roomId.from || !roomId.to) {
                    console.warn(`Socket ${socket.id} tried to join a chat room without proper roomId`);
                    socket.emit("error", { message: "Invalid roomId provided" });
                    return;
                }
            
                const normalizedRoomId = [roomId.from, roomId.to].sort().join("-");
                const roomName = `chat-${normalizedRoomId}`;
            
                if (!chatRooms.has(roomName)) {
                    chatRooms.set(roomName, { participants: [roomId.from, roomId.to], messages: [] });
                }
            
                socket.join(roomName);
                socket.emit("joined-room", { roomName });
            });

            socket.on("send-message", async (data, callback = () => {}) => {

                const { to, from, roomId, fileDetails , type:resource_type } = data; 
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
            socket.on("check-online", (selectedUser) => {
               
               let user = Object.values(checkonline).find((u) => u.userId === selectedUser);
               if (user) {
               io.to(socket.id).emit("user-status", { online: true, user });
               io.to(user.socketId).emit("user-status", { online: true, user });
               } else { 
                   io.to(socket.id).emit("user-status", { online: false });
               }
               
            });

            socket.on("typing", (data) => {
                const { roomId, from } = data;
        
                if (!roomId || !from) {
                    console.warn(`Invalid typing event from socket ${socket.id}`);
                    return;
                }
        
                const roomName = `chat-${roomId}`;
                socket.to(roomName).emit("user-typing", { from, isTyping: true });
            });
        
            socket.on("stop-typing", (data) => {
                const { roomId, from } = data;
        
                if (!roomId || !from) {
                    console.warn(`Invalid stop-typing event from socket ${socket.id}`);
                    return;
                }
        
                const roomName = `chat-${roomId}`;
                socket.to(roomName).emit("user-typing", { from, isTyping: false });
            });
        
            // Get the last message of a user
            socket.on("get-last-message", async (data, callback = () => {}) => {
                const { userId, roomId } = data;
        
                if (!userId || !roomId) {
                    console.warn(`Invalid last message request from socket ${socket.id}`);
                    callback({ error: "Missing required fields." });
                    return;
                }
                
                try {
                    const lastMessage = await Message.findOne({ roomId, from: userId })
                        .sort({ createdAt: -1 })
                        .exec();
        
                    if (!lastMessage) {
                        callback({ success: false, message: "No messages found." });
                    } else {
                        callback({ success: true, lastMessage });
                    }
                } catch (error) {
                    console.error("Error fetching last message:", error);
                    callback({ error: "Failed to fetch last message." });
                }
            });


            // Handle disconnection
            socket.on("disconnect", () => {
                const disconnectedUser = onlineUsers[socket.id];

                if (!disconnectedUser) {
                    console.warn(`Socket ${socket.id} disconnected without a userId`);
                    return;
                }

                delete checkonline[disconnectedUser.userId];
                delete onlineUsers[socket.id];
                io.emit("update-online-users", onlineUsers );
                io.emit("user-status", { online: false, user: disconnectedUser });
                
            });
        });
    }
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





