const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const FriendRequestModel = require('../models/FriendRequestModel');
const { io, userSocketMap } = require('../socket/index');

async function sendFriendRequest(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (user.logout) {
            return response.status(401).json({ message: user.message, logout: true });
        }

        const { toUserId } = request.body;

        if (!toUserId) {
            return response.status(400).json({ message: "User ID is required", error: true });
        }

        if (toUserId === user._id.toString()) {
            return response.status(400).json({ message: "Cannot send request to yourself", error: true });
        }

        // Check if a request already exists (in either direction)
        const existing = await FriendRequestModel.findOne({
            $or: [
                { from: user._id, to: toUserId },
                { from: toUserId, to: user._id }
            ]
        });

        if (existing) {
            if (existing.status === 'accepted') {
                return response.status(400).json({ message: "Already friends", error: true });
            }
            if (existing.status === 'pending') {
                return response.status(400).json({ message: "Request already pending", error: true });
            }
            // If rejected, allow re-sending by updating status
            if (existing.status === 'rejected') {
                existing.from = user._id;
                existing.to = toUserId;
                existing.status = 'pending';
                await existing.save();

                const receiverSocketId = userSocketMap.get(toUserId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('friend_request', {
                        from: {
                            _id: user._id,
                            name: user.name,
                            profile_pic: user.profile_pic
                        },
                        status: 'pending'
                    });
                }

                return response.status(200).json({ message: "Friend request sent", success: true });
            }
        }

        const newRequest = new FriendRequestModel({
            from: user._id,
            to: toUserId
        });
        await newRequest.save();

        const receiverSocketId = userSocketMap.get(toUserId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('friend_request', {
                from: {
                    _id: user._id,
                    name: user.name,
                    profile_pic: user.profile_pic
                },
                status: 'pending'
            });
        }

        return response.status(200).json({ message: "Friend request sent", success: true });

    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true });
    }
}

module.exports = sendFriendRequest;
