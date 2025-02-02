import chatService from "../services/chatService.js";    
import ResponseService from "../services/response.services.js";
import { StatusCodes } from 'http-status-codes';

class ChatController {
    /**
     * Get all messages between two users.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async getMessages(req, res) {
        try {
            const { from, to } = req.query;
            if (!from || !to) {
                return ResponseService.send(res, 400, "Missing 'from' or 'to' query parameters", 0);
            }
            const messages = await chatService.getMessages(from, to);
            return ResponseService.send(res, 200, "Messages fetched successfully", 1, messages);
        } catch (error) {
            console.error("Error fetching messages:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    /**
     * Save a new message (text, image, video, or audio).
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async sendMessage(req, res) {
        try {
            const { from, to, type } = req.body;
            let message = req.body.message;

            if (req.files && req.files?.chatImage?.[0]?.path) {
                message = req.files.chatImage[0].path;
            }

            if (!from || !to || !message) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Missing required fields", 0);
            }

            const savedMessage = await chatService.saveMessage({ from, to, message, type });
            return ResponseService(res, StatusCodes.OK, "Message sent successfully", 1, savedMessage);
        } catch (error) {
            console.error("Error saving message:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }

    /**
     * Mark a message as read.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    async markAsRead(req, res) {
        const { messageId } = req.body;

        try {
            // Call the service to mark the message as read
            const updatedMessage = await chatService.markAsRead(messageId);

            if (!updatedMessage) {
                return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Message not found", 0);
            }

            return ResponseService(res, 200, "Message marked as read", 1, updatedMessage);
        } catch (error) {
            console.error("Error marking message as read:", error);
            return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
        }
    }
}

export default  ChatController;
