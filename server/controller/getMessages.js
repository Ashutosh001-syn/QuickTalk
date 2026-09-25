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

        // The frontend will emit 'mark_as_seen' via socket to mark these as seen,
        // so we don't need to duplicate the DB update here.

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
