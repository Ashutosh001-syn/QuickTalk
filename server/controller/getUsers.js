const UserModel = require('../models/UserModel');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const FriendRequestModel = require('../models/FriendRequestModel');

async function getUsers(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (user.logout) {
            return response.status(401).json({
                message: user.message,
                logout: true
            });
        }

        // Get accepted friend requests only
        const acceptedRequests = await FriendRequestModel.find({
            $or: [
                { from: user._id, status: 'accepted' },
                { to: user._id, status: 'accepted' }
            ]
        });

        // Extract friend IDs
        const friendIds = acceptedRequests.map(req => {
            return req.from.toString() === user._id.toString()
                ? req.to
                : req.from;
        });

        // If no friends, return empty
        if (friendIds.length === 0) {
            return response.status(200).json({
                message: "No friends yet",
                success: true,
                data: []
            });
        }

        const { conversationModel } = require('../models/ConversationModel');
        const friends = await UserModel.find({ _id: { $in: friendIds } }).select("-password");

        const conversations = await conversationModel.find({
            $or: [
                { sender: user._id },
                { receiver: user._id }
            ]
        }).populate('messages');

        const userList = friends.map(u => {
            const userObj = u.toObject();
            const conv = conversations.find(c => 
                c.sender.toString() === u._id.toString() || 
                c.receiver.toString() === u._id.toString()
            );
            
            if (conv && conv.messages.length > 0) {
                userObj.lastMessage = conv.messages[conv.messages.length - 1];
                userObj.unseenMsg = conv.messages.filter(msg => 
                    msg.seen === false && msg.msgByUserId.toString() !== user._id.toString()
                ).length;
            } else {
                userObj.lastMessage = null;
                userObj.unseenMsg = 0;
            }
            return userObj;
        });

        return response.status(200).json({
            message: "Friends fetched",
            success: true,
            data: userList
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = getUsers;
