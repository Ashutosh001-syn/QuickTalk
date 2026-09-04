const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const UserModel = require('../models/UserModel');
const FriendRequestModel = require('../models/FriendRequestModel');

async function searchUsers(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (user.logout) {
            return response.status(401).json({ message: user.message, logout: true });
        }

        const { query } = request.query;

        if (!query || query.trim().length === 0) {
            return response.status(200).json({ message: "No query", success: true, data: [] });
        }

        // Search users by name or email (case-insensitive), exclude self
        const results = await UserModel.find({
            _id: { $ne: user._id },
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select('-password').limit(20);

        // For each result, check friend request status
        const friendRequests = await FriendRequestModel.find({
            $or: [
                { from: user._id, to: { $in: results.map(r => r._id) } },
                { to: user._id, from: { $in: results.map(r => r._id) } }
            ]
        });

        const enrichedResults = results.map(u => {
            const userObj = u.toObject();
            const req = friendRequests.find(fr =>
                (fr.from.toString() === user._id.toString() && fr.to.toString() === u._id.toString()) ||
                (fr.to.toString() === user._id.toString() && fr.from.toString() === u._id.toString())
            );

            if (req) {
                userObj.requestStatus = req.status;
                userObj.requestDirection = req.from.toString() === user._id.toString() ? 'sent' : 'received';
            } else {
                userObj.requestStatus = null;
                userObj.requestDirection = null;
            }
            return userObj;
        });

        return response.status(200).json({
            message: "Search results",
            success: true,
            data: enrichedResults
        });

    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true });
    }
}

module.exports = searchUsers;
