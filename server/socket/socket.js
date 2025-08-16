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
});

const getSocketId = (userId) => {
    return userSocketMap[userId];
}