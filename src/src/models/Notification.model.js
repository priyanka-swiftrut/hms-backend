import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    targetUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});


const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;