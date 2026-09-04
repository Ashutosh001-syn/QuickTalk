const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const UserModel = require('../models/UserModel');
const { conversationModel, MessageModel } = require('../models/ConversationModel');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [process.env.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true
    }
});

// Map of online users: userId => socketId
const onlineUsers = new Set();
const userSocketMap = new Map();

io.on('connection', async (socket) => {
    console.log("Connected User:", socket.id);

    const token = socket.handshake.auth.token;
    
    // Check if user is authenticated
    const user = await getUserDetailsFromToken(token);
    
    if (user.logout || !user) {
        return socket.disconnect();
    }

    const userId = user._id.toString();
    onlineUsers.add(userId);
    userSocketMap.set(userId, socket.id);

    // Broadcast that this user is online
    io.emit('online_users', Array.from(onlineUsers));

    // Listen for new messages
    socket.on('send_message', async (data) => {
        const { receiver, text, imageUrl, videoUrl, replyTo } = data;
        
        try {
            // Save message
            const msgData = {
                text,
                imageUrl,
                videoUrl,
                msgByUserId: userId
            };
            if (replyTo) {
                msgData.replyTo = {
                    text: replyTo.text,
                    imageUrl: replyTo.imageUrl,
                    videoUrl: replyTo.videoUrl,
                    msgByUserId: replyTo.msgByUserId
                };
            }
            const newMessage = new MessageModel(msgData);
            const saveMessage = await newMessage.save();
            
            // Find or create conversation
            let conversation = await conversationModel.findOne({
                $or: [
                    { sender: userId, receiver: receiver },
                    { sender: receiver, receiver: userId }
                ]
            });

            if (!conversation) {
                conversation = new conversationModel({
                    sender: userId,
                    receiver: receiver,
                    messages: [saveMessage._id]
                });
            } else {
                conversation.messages.push(saveMessage._id);
            }
            
            await conversation.save();

            const payload = {
                ...saveMessage.toObject(),
                sender: userId,
                receiver: receiver
            };

            // Emit to receiver if online
            const receiverSocketId = userSocketMap.get(receiver);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message', payload);
            }
            
            // Emit back to sender so they see it instantly
            io.to(socket.id).emit('new_message', payload);

        } catch (error) {
            console.error("Error sending message via socket", error);
        }
    });

    socket.on('delete_message', async (data) => {
        const { messageId, receiverId } = data;
        try {
            const message = await MessageModel.findById(messageId);
            // Verify that the user trying to delete is the actual sender of the message
            if (message && message.msgByUserId.toString() === userId) {
                message.deleted = true;
                message.text = "";
                message.imageUrl = "";
                message.videoUrl = "";
                await message.save();

                const payload = {
                    messageId,
                    receiver: receiverId,
                    sender: userId
                };

                // Emit to receiver if online
                const receiverSocketId = userSocketMap.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('message_deleted', payload);
                }
                
                // Emit back to sender so UI updates instantly
                io.to(socket.id).emit('message_deleted', payload);
            }
        } catch (error) {
            console.error("Error deleting message via socket", error);
        }
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        userSocketMap.delete(userId);
        console.log("Disconnect User:", socket.id);
        io.emit('online_users', Array.from(onlineUsers));
    });
});

module.exports = { app, server, io };
