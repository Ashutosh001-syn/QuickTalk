const UserModel = require('../models/UserModel');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');

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

        const { conversationModel } = require('../models/ConversationModel');
        const allUsers = await UserModel.find({ _id: { $ne: user._id } }).select("-password");

        const conversations = await conversationModel.find({
            $or: [
                { sender: user._id },
                { receiver: user._id }
            ]
        }).populate('messages');

        const userList = allUsers.map(u => {
            const userObj = u.toObject();
            const conv = conversations.find(c => 
                c.sender.toString() === u._id.toString() || 
                c.receiver.toString() === u._id.toString()
            );
            
            if (conv && conv.messages.length > 0) {
                userObj.lastMessage = conv.messages[conv.messages.length - 1];
                // Count unseen messages sent by this user
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
            message: "All users fetched",
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
