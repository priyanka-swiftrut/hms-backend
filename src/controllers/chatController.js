const chatService = require("../services/chatService");
const { sendResponse } = require("../services/response.services");

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
                return res.status(400).json({ error: "Missing 'from' or 'to' query parameters" });
            }
            const messages = await chatService.getMessages(from, to);
            return sendResponse(res, 200, "Messages fetched successfully", 1, messages);
        } catch (error) {
            console.error("Error fetching messages:", error);
            res.status(500).json({ error: "Failed to fetch messages" });
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
                return res.status(400).json({ error: "Missing required fields" });
            }

            const savedMessage = await chatService.saveMessage({ from, to, message, type });
            return sendResponse(res, 200, "Message sent successfully", 1, savedMessage);
        } catch (error) {
            console.error("Error saving message:", error);
            res.status(500).json({ error: "Failed to send message" });
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
                return res.status(404).json({ message: "Message not found" });
            }

            return sendResponse(res, 200, "Message marked as read", 1, updatedMessage);
        } catch (error) {
            console.error("Error marking message as read:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
}

module.exports = new ChatController();
