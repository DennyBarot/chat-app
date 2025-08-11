import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/messageModel.js";
import { trimTrailingSlash } from "../utilities/stringUtils.js";

const app = express();
const server = http.createServer(app);

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

  if (!userId) return;

  userSocketMap[userId] = socket.id;

  io.emit("onlineUsers", Object.keys(userSocketMap))

  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    io.emit("onlineUsers", Object.keys(userSocketMap));
  });

  socket.on('sendMessage', async ({ content, senderId, replyTo, conversationId }) => {
    try {
      let quotedContent = '';
      if (replyTo) {
        const quotedMsg = await Message.findById(replyTo);
        if (quotedMsg) quotedContent = quotedMsg.content;
      }
      const message = new Message({ content, senderId, replyTo, quotedContent, readBy: [senderId] });
      await message.save();
      io.to(conversationId).emit('newMessage', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
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
      const messagesToUpdate = await Message.find({
        conversationId,
        readBy: { $ne: userId }
      });

      if (messagesToUpdate.length > 0) {
        const messageIds = messagesToUpdate.map(msg => msg._id);

        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $addToSet: { readBy: userId } }
        );

        const uniqueSenderIds = [...new Set(messagesToUpdate.map(msg => msg.senderId.toString()))];
        uniqueSenderIds.forEach(senderId => {
          const senderSocketId = getSocketId(senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit('messagesRead', {
              messageIds,
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

  socket.on('viewConversation', async ({ conversationId, userId }) => {
    try {
      const messagesToUpdate = await Message.find({
        conversationId,
        readBy: { $ne: userId }
      });

      if (messagesToUpdate.length > 0) {
        const messageIds = messagesToUpdate.map(msg => msg._id);

        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $addToSet: { readBy: userId } }
        );

        const participantsToNotify = new Set();
        participantsToNotify.add(userId.toString());
        messagesToUpdate.forEach(msg => participantsToNotify.add(msg.senderId.toString()));

        participantsToNotify.forEach(participantId => {
          const socketId = getSocketId(participantId);
          if (socketId) {
            io.to(socketId).emit('messagesRead', {
              messageIds,
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