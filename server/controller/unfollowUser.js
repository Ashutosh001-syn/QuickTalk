const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const FriendRequestModel = require('../models/FriendRequestModel');
const { io, userSocketMap } = require('../socket/index');

async function unfollowUser(request, response) {
    try {
        const user = await getUserDetailsFromToken(request.cookies.token || '');
        if (user.logout) {
            return response.status(401).json({ message: user.message, logout: true });
        }

        const { userId } = request.params;
        const friendship = await FriendRequestModel.findOneAndDelete({
            status: 'accepted',
            $or: [
                { from: user._id, to: userId },
                { from: userId, to: user._id }
            ]
        });

        if (!friendship) {
            return response.status(404).json({ message: 'Friend connection not found', error: true });
        }

        const recipientSocketId = userSocketMap.get(String(userId));
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('friend_removed', { userId: user._id.toString() });
        }

        return response.status(200).json({
            message: 'Unfollowed successfully',
            success: true,
            data: { userId }
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true });
    }
}

module.exports = unfollowUser;
