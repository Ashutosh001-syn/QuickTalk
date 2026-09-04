const { conversationModel } = require('../models/ConversationModel');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');

async function getMessages(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (user.logout) {
            return response.status(401).json({
                message: user.message,
                logout: true
            });
        }

        const { userId } = request.params; // The other user's ID

        if (!userId) {
            return response.status(400).json({ message: "User ID is required", error: true });
        }

        // Find the conversation and populate messages
        const currentUserId = user._id.toString();
        const conversation = await conversationModel.findOne({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ]
        }).populate('messages');

        const messages = conversation ? conversation.messages : [];

        // Mark all messages from the other user as seen
        if (conversation) {
            const unseenMessages = messages.filter(msg => msg.seen === false && msg.msgByUserId.toString() !== currentUserId);
            if (unseenMessages.length > 0) {
                const { MessageModel } = require('../models/ConversationModel');
                await MessageModel.updateMany(
                    { _id: { $in: unseenMessages.map(m => m._id) } },
                    { $set: { seen: true } }
                );
            }
        }

        return response.status(200).json({
            message: "Messages fetched successfully",
            success: true,
            data: messages
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = getMessages;
