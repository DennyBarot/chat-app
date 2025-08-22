import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";

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

const getSocketId = (userId) => {
    return userSocketMap[userId];
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

  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocketId = getSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId, receiverId });
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocketId = getSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId, receiverId });
    }
  });

  // The following events are now handled by API controllers and emit via `io` directly
  // socket.on('sendMessage', ...)
  // socket.on('markMessageRead', ...)
  // socket.on('markConversationRead', ...)
  // socket.on('viewConversation', ...)
   // Handle viewConversation event for read receipts
  socket.on('viewConversation', ({ conversationId, userId }) => {
    console.log(`User ${userId} viewed conversation ${conversationId}`);
    // This can be used to track active conversations or implement typing indicators
  });

  // Handle message events (these are primarily handled by API controllers)
  socket.on('sendMessage', (data) => {
    console.log('Message sent via socket:', data);
    // This would typically be handled by the message controller API
  });

  socket.on('markMessageRead', (data) => {
    console.log('Message marked as read:', data);
    // This would typically be handled by the message controller API
  });

  socket.on('markConversationRead', (data) => {
    console.log('Conversation marked as read:', data);
    // This would typically be handled by the message controller API
  });
});
