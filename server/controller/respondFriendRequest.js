const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const FriendRequestModel = require('../models/FriendRequestModel');
const { io, userSocketMap } = require('../socket/index');

async function respondFriendRequest(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (user.logout) {
            return response.status(401).json({ message: user.message, logout: true });
        }

        const { requestId, action } = request.body; // action: 'accept' or 'reject'

        if (!requestId || !action) {
            return response.status(400).json({ message: "Request ID and action required", error: true });
        }

        const friendRequest = await FriendRequestModel.findById(requestId);

        if (!friendRequest) {
            return response.status(404).json({ message: "Request not found", error: true });
        }

        // Only the receiver can respond
        if (friendRequest.to.toString() !== user._id.toString()) {
            return response.status(403).json({ message: "Not authorized", error: true });
        }

        if (action === 'accept') {
            friendRequest.status = 'accepted';
        } else if (action === 'reject') {
            friendRequest.status = 'rejected';
        } else {
            return response.status(400).json({ message: "Invalid action", error: true });
        }

        await friendRequest.save();

        const senderSocketId = userSocketMap.get(friendRequest.from.toString());
        if (senderSocketId) {
            io.to(senderSocketId).emit('request_response', {
                requestId: friendRequest._id,
                status: friendRequest.status,
                to: {
                    _id: user._id,
                    name: user.name,
                    profile_pic: user.profile_pic
                }
            });
        }

        // Also emit to receiver (the person accepting) so they can update their local state instantly
        const receiverSocketId = userSocketMap.get(user._id.toString());
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('request_response', {
                requestId: friendRequest._id,
                status: friendRequest.status
            });
        }

        return response.status(200).json({
            message: `Request ${action}ed`,
            success: true,
            data: friendRequest
        });

    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true });
    }
}

module.exports = respondFriendRequest;
