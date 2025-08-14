import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/messageModel.js";

const app = express();
const server = http.createServer(app);

const trimTrailingSlash = (url) => (url?.endsWith('/') ? url.slice(0, -1) : url);

const io = new Server(server, {
  cors: {
    origin: trimTrailingSlash(process.env.CLIENT_URL),
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket']
});

// Map of userId to socket.id for fast lookups
const userSocketMap = {};

const getSocketId = (userId) => userSocketMap[userId];

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  const userId = socket.handshake.query.userId;
  if (!userId) return;

  // Update user-socket mapping
  userSocketMap[userId] = socket.id;
  console.log("UserSocketMap updated:", userSocketMap);

  // Emit updated online users list to all clients
  io.emit("onlineUsers", Object.keys(userSocketMap));

  // Clean up on disconnect
  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    io.emit("onlineUsers", Object.keys(userSocketMap));
    console.log(`Socket disconnected: ${socket.id}, UserId: ${userId}`);
  });

  // Handle real-time messaging
  socket.on('sendMessage', async ({ content, senderId, replyTo, conversationId }) => {
    let quotedContent = '';
    if (replyTo) {
      const quotedMsg = await Message.findById(replyTo);
      quotedContent = quotedMsg?.content || '';
    }
    const message = new Message({
      content,
      senderId,
      replyTo,
      quotedContent,
      readBy: [senderId],
      conversationId
    });
    await message.save();
    // Broadcast new message to all participants in this conversation
    io.to(conversationId).emit('newMessage', message);
  });

  socket.on('markConversationAsRead', async ({ conversationId, userId }) => {
    try {
      // Find all messages in the conversation that the user has not read
      const messagesToUpdate = await Message.find({
        conversationId,
        readBy: { $ne: userId }
      });

      if (messagesToUpdate.length === 0) return;

      const messageIdsToUpdate = messagesToUpdate.map(msg => msg._id);

      // Update all found messages in a single operation
      await Message.updateMany(
        { _id: { $in: messageIdsToUpdate } },
        { $addToSet: { readBy: userId } }
      );

      // Fetch the updated messages to get the latest state
      const updatedMessages = await Message.find({ _id: { $in: messageIdsToUpdate } });

      // Notify all clients in the conversation that messages have been read
       // Calculate the new unread count for the user who marked messages as read
      const newUnreadCount = await Message.countDocuments({
        conversationId: conversationId,
        readBy: { $ne: userId },
        senderId: { $ne: userId } // Only count messages sent by others
      });
      io.to(conversationId).emit('messagesRead', {
        conversationId,
        userId,
        messageIds: updatedMessages.map(msg => msg._id),
        readBy: userId, // for consistency with single message read
        readAt: new Date(),
       unreadCount: newUnreadCount // Include the updated unread coun
      });

    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  });

  // Typing indicator handler
  socket.on('typing', (data) => {
    if (!data?.conversationId || !data?.userId) return;
    // Broadcast to everyone in this conversation *except* the sender
    socket.to(data.conversationId).emit('userTyping', data);
  });
});

export { io, server, app, getSocketId, userSocketMap };