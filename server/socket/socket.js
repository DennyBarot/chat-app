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

  // Mark a single message as read
  socket.on('markMessageRead', async ({ messageId, userId, conversationId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.readBy.includes(userId)) {
        message.readBy.push(userId);
        await message.save();
        // Notify sender about read receipt
        const senderSocketId = getSocketId(message.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messageRead', {
            messageId,
            readBy: userId,
            readAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // Mark all unread messages in a conversation as read
  socket.on('markConversationRead', async ({ conversationId, userId }) => {
    try {
      const messages = await Message.find({
        conversationId,
        readBy: { $ne: userId }
      });

      const updatedMessages = [];
      for (const message of messages) {
        message.readBy.push(userId);
        await message.save();
        updatedMessages.push(message._id);
      }

      if (updatedMessages.length) {
        // Notify all senders in this conversation
        const uniqueSenderIds = [...new Set(messages.map(msg => msg.senderId.toString()))];
        uniqueSenderIds.forEach(senderId => {
          const senderSocketId = getSocketId(senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit('messagesRead', {
              messageIds: updatedMessages,
              readBy: userId,
              readAt: new Date()
            });
          }
        });
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  });

  // When a user opens a conversation
  socket.on('viewConversation', async ({ conversationId, userId }) => {
    try {
      const messages = await Message.find({
        conversationId,
        readBy: { $ne: userId }
      });

      if (messages.length > 0) {
        const updatedMessages = [];
        for (const message of messages) {
          message.readBy.push(userId);
          await message.save();
          updatedMessages.push(message._id);
        }

        const uniqueSenderIds = [...new Set(messages.map(msg => msg.senderId.toString()))];
        uniqueSenderIds.forEach(senderId => {
          const senderSocketId = getSocketId(senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit('messagesRead', {
              messageIds: updatedMessages,
              readBy: userId,
              readAt: new Date()
            });
          }
        });
      }
    } catch (error) {
      console.error('Error viewing conversation:', error);
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

