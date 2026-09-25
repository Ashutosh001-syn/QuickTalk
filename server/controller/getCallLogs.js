const { MessageModel } = require("../models/ConversationModel");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");

async function getCallLogs(request, response) {
    try {
        const user = await getUserDetailsFromToken(request.cookies.token || "");
        if (user.logout) {
            return response.status(401).json({
                message: "Unauthorized",
                error: true,
            });
        }

        const { conversationModel } = require("../models/ConversationModel");

        const conversations = await conversationModel.find({
            $or: [
                { sender: user._id },
                { receiver: user._id }
            ]
        }).populate({
            path: 'messages',
            match: { isCall: true },
            populate: {
                path: 'msgByUserId',
                select: 'name profile_pic'
            }
        });

        let callLogs = [];
        const UserModel = require("../models/UserModel");

        for (let conv of conversations) {
            if (conv.messages && conv.messages.length > 0) {
                const otherUserId = conv.sender.toString() === user._id.toString() ? conv.receiver : conv.sender;
                const otherUser = await UserModel.findById(otherUserId).select('name profile_pic');

                for (let msg of conv.messages) {
                    callLogs.push({
                        _id: msg._id,
                        callType: msg.callType,
                        callDuration: msg.callDuration,
                        createdAt: msg.createdAt,
                        caller: msg.msgByUserId,
                        otherUser: otherUser
                    });
                }
            }
        }

        callLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return response.status(200).json({
            message: "Call logs fetched successfully",
            data: callLogs,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = getCallLogs;
