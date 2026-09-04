const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const FriendRequestModel = require('../models/FriendRequestModel');

async function getFriendRequests(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (user.logout) {
            return response.status(401).json({ message: user.message, logout: true });
        }

        const pendingRequests = await FriendRequestModel.find({
            to: user._id,
            status: 'pending'
        }).populate('from', 'name email profile_pic');

        return response.status(200).json({
            message: "Friend requests fetched",
            success: true,
            data: pendingRequests
        });

    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true });
    }
}

module.exports = getFriendRequests;
