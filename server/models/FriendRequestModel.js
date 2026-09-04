const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User'
    },
    to: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Prevent duplicate requests
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

const FriendRequestModel = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequestModel;
