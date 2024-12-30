const express = require("express");
const router = express.Router();

const { getMessages, sendMessage } = require("../controllers/chatController");
const upload = require('../services/multer.services');
// Fetch chat messages
router.get("/messages", getMessages);

// Save a new chat message
router.post("/message",upload.fields([{ name: 'chatImage', maxCount: 1 }]), sendMessage);

module.exports = router;