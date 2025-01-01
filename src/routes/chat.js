import express from "express";
import ChatController from "../controllers/chatController.js";
import upload from "../services/multer.services.js";

const router = express.Router();
const chatController = new ChatController();

// Fetch chat messages
router.get("/messages",  chatController.getMessages.bind(chatController));
// Save a new chat message
router.post("/message" , upload.fields([{ name: "chatImage", maxCount: 1 }]), chatController.sendMessage.bind(chatController));

export default router;
