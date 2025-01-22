import Message from "../models/Message.model.js";

const MessageService = {
    /**
     * Save a new chat message to the database.
     * @param {Object} messageData - { from, to, message, type }
     * @returns {Object} - Saved message object.
     */
    async saveMessage({ from, to, message, type }) {
        try {
            const newMessage = new Message({
                from,
                to,
                message,
                type: type || "text", // Default to text if type is not provided
                timestamp: new Date(),
                read: false, // Default status to "unread"
            });
            await newMessage.save();
            return newMessage;
        } catch (error) {
            console.error("Error saving message:", error);
            throw error;
        }
    },

    /**
     * Get chat messages between two users.
     * @param {String} from - Sender's user ID.
     * @param {String} to - Receiver's user ID.
     * @returns {Array} - List of messages sorted by timestamp.
     */
    async getMessages(from, to) {
        try {
            const messages = await Message.find({
                $or: [
                    { from, to },
                    { from: to, to: from },
                ],
            }).sort({ timestamp: 1 });
            return messages;
        } catch (error) {
            console.error("Error fetching messages:", error);
            throw error;
        }
    },

    /**
     * Mark messages as read for a particular user.
     * @param {String} from - Sender's user ID.
     * @param {String} to - Receiver's user ID.
     * @returns {Object} - Result of update operation.
     */
    async markMessagesAsRead(from, to) {
        try {
            const result = await Message.updateMany(
                { from, to, read: false },
                { $set: { read: true } }
            );
            return result;
        } catch (error) {
            console.error("Error marking messages as read:", error);
            throw error;
        }
    },
};

export default MessageService;
