const { conversationModel, MessageModel } = require('../models/ConversationModel');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');

async function deleteChat(request, response) {
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

        // Find the conversation
        const conversation = await conversationModel.findOne({
            $or: [
                { sender: user._id, receiver: userId },
                { sender: userId, receiver: user._id }
            ]
        });

        if (!conversation) {
            return response.status(404).json({
                message: "Conversation not found",
                success: false
            });
        }

        // Delete all messages associated with this conversation
        await MessageModel.deleteMany({ _id: { $in: conversation.messages } });

        // Delete the conversation document itself
        await conversationModel.deleteOne({ _id: conversation._id });

        return response.status(200).json({
            message: "Chat deleted successfully",
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = deleteChat;
