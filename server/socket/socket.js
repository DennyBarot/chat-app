import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/messageModel.js";

const app = express();
const server = http.createServer(app);

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

const io = new Server(server, {
  cors: {
    origin: trimTrailingSlash(process.env.CLIENT_URL), 
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
});

const userSocketMap = {
    // userId : socketId,
}

export { io, app, server, getSocketId, userSocketMap };

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("Socket connected:", socket.id, "UserId:", userId);

  if (!userId) return;

  userSocketMap[userId] = socket.id;
  console.log("UserSocketMap updated:", userSocketMap);

  io.emit("onlineUsers", Object.keys(userSocketMap))

  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    console.log("Socket disconnected:", socket.id, "UserId:", userId);
    io.emit("onlineUsers", Object.keys(userSocketMap));
  });

  socket.on('sendMessage', async ({ content, senderId, replyTo }) => {
    let quotedContent = '';
    if (replyTo) {
      const quotedMsg = await Message.findById(replyTo);
      if (quotedMsg) quotedContent = quotedMsg.content;
    }
    const message = new Message({ content, senderId, replyTo, quotedContent });
    await message.save();
    io.to(conversationId).emit('newMessage', message);
  });

  socket.on('markMessageRead', async ({ messageId, userId, conversationId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.readBy.includes(userId)) {
        message.readBy.push(userId);
        await message.save();
        
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
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  });

  socket.on('viewConversation', async ({ conversationId, userId }) => {
    try {
      const messages = await Message.find({
        conversationId,
        senderId: { $ne: userId },
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
});

const getSocketId = (userId) => {
    return userSocketMap[userId];
}
