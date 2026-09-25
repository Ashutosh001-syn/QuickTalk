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
    
    if (!user || user.logout) {
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
            } else {
                // Receiver is offline, send background push notification
                try {
                    const receiverUser = await UserModel.findById(receiver);
                    if (receiverUser && receiverUser.pushSubscriptions && receiverUser.pushSubscriptions.length > 0) {
                        const senderUser = await UserModel.findById(userId);
                        const pushPayload = JSON.stringify({
                            title: `New message from ${senderUser.name}`,
                            body: saveMessage.text || 'You received a new message',
                            url: '/',
                            icon: senderUser.profile_pic || '/favicon.ico'
                        });

                        const webpush = require('web-push');
                        webpush.setVapidDetails(
                            process.env.VAPID_SUBJECT || 'mailto:admin@quicktalk.com',
                            process.env.VAPID_PUBLIC_KEY,
                            process.env.VAPID_PRIVATE_KEY
                        );

                        const notifications = receiverUser.pushSubscriptions.map(sub => 
                            webpush.sendNotification(sub, pushPayload).catch(err => {
                                if (err.statusCode === 410 || err.statusCode === 404) {
                                    // Subscription has expired or is no longer valid, we could remove it from DB here
                                    return UserModel.updateOne(
                                        { _id: receiverUser._id },
                                        { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
                                    );
                                }
                            })
                        );
                        await Promise.all(notifications);
                    }
                } catch (pushError) {
                    console.error("Error sending web push notification:", pushError);
                }
            }
            
            
            // Emit back to sender so they see it instantly
            io.to(socket.id).emit('new_message', payload);

        } catch (error) {
            console.error("Error sending message via socket", error);
        }
    });

    // Typing events are deliberately not persisted; they are only relevant while both users are online.
    socket.on('typing_status', ({ receiverId, isTyping }) => {
        const receiverSocketId = userSocketMap.get(String(receiverId));
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing_status', { senderId: userId, isTyping: Boolean(isTyping) });
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

    socket.on('mark_as_seen', async (data) => {
        const { senderId } = data; // The person who sent the messages that the current user (userId) is now seeing
        try {
            // Find all unread messages sent by senderId to the current user, and mark them as seen
            const result = await MessageModel.updateMany(
                { msgByUserId: senderId, seen: false }, 
                { seen: true }
            );

            // If we actually updated some messages, notify the sender that they were seen
            if (result.modifiedCount > 0) {
                const senderSocketId = userSocketMap.get(senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messages_seen', {
                        seenBy: userId // Tell the sender that this specific user saw their messages
                    });
                }
            }
        } catch (error) {
            console.error("Error marking messages as seen", error);
        }
    });

    // --- WEBRTC CALLING SIGNALING ---

    socket.on('initiate_call', (data, acknowledgement) => {
        const { userToCall, signalData, callId, callerName, callerPic, isVideo } = data;
        const receiverSocketId = userSocketMap.get(String(userToCall));
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('incoming_call', {
                signal: signalData,
                callId,
                from: userId,
                callerName,
                callerPic,
                isVideo
            });
            acknowledgement?.({ ok: true });
        } else {
            socket.emit('call_unavailable', { callId });
            acknowledgement?.({ ok: false, message: 'This user is offline.' });
        }
    });

    socket.on('accept_call', (data) => {
        const { to, signal, callId } = data;
        const callerSocketId = userSocketMap.get(String(to));
        if (callerSocketId) {
            io.to(callerSocketId).emit('call_accepted', { callId, signal });
        }
    });

    socket.on('end_call', (data) => {
        const { to, callId } = data;
        const otherSocketId = userSocketMap.get(String(to));
        if (otherSocketId) {
            io.to(otherSocketId).emit('call_ended', { callId });
        }
    });

    socket.on('save_call_log', async (data) => {
        const { receiverId, callType, callDuration } = data;
        
        try {
            const msgData = {
                text: "",
                imageUrl: "",
                videoUrl: "",
                isCall: true,
                callType,
                callDuration,
                msgByUserId: userId
            };
            
            const newMessage = new MessageModel(msgData);
            const saveMessage = await newMessage.save();
            
            // Find or create conversation
            let conversation = await conversationModel.findOne({
                $or: [
                    { sender: userId, receiver: receiverId },
                    { sender: receiverId, receiver: userId }
                ]
            });

            if (!conversation) {
                conversation = new conversationModel({
                    sender: userId,
                    receiver: receiverId,
                    messages: [saveMessage._id]
                });
            } else {
                conversation.messages.push(saveMessage._id);
            }
            
            await conversation.save();

            const payload = {
                ...saveMessage.toObject(),
                sender: userId,
                receiver: receiverId
            };

            // Emit to receiver if online
            const receiverSocketId = userSocketMap.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message', payload);
            }
            
            // Emit back to sender
            io.to(socket.id).emit('new_message', payload);

        } catch (error) {
            console.error("Error saving call log", error);
        }
    });

    // --------------------------------

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        userSocketMap.delete(userId);
        console.log("Disconnect User:", socket.id);
        io.emit('online_users', Array.from(onlineUsers));
    });
});

module.exports = { app, server, io, userSocketMap };
