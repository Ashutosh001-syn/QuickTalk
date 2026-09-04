const { MessageModel, conversationModel } = require('../models/ConversationModel');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');

async function sendMessage(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (user.logout) {
            return response.status(401).json({
                message: user.message,
                logout: true
            });
        }

        const { receiver, text, imageUrl, videoUrl } = request.body;

        if (!receiver) {
            return response.status(400).json({ message: "Receiver ID is required", error: true });
        }

        // Create new message
        const newMessage = new MessageModel({
            text,
            imageUrl,
            videoUrl,
            msgByUserId: user._id
        });
        const saveMessage = await newMessage.save();

        // Check if conversation exists
        let conversation = await conversationModel.findOne({
            $or: [
                { sender: user._id, receiver: receiver },
                { sender: receiver, receiver: user._id }
            ]
        });

        if (!conversation) {
            conversation = new conversationModel({
                sender: user._id,
                receiver: receiver,
                messages: [saveMessage._id]
            });
        } else {
            conversation.messages.push(saveMessage._id);
        }

        await conversation.save();

        return response.status(201).json({
            message: "Message sent successfully",
            success: true,
            data: saveMessage
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = sendMessage;
