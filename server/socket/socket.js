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

const userSocketMap = {}; // We still use this to track WHO is online for the "online users" feature.

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined") {
    console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);
    userSocketMap[userId] = socket.id;
    
    // --- THE CRUCIAL CHANGE ---
    // The user joins a room named after their own user ID. This is very reliable.
    socket.join(userId);

    // Emit the list of online user IDs to everyone.
    io.emit("onlineUsers", Object.keys(userSocketMap));
  }

  socket.on("disconnect", () => {
    if (userId && userId !== "undefined") {
      console.log(`User disconnected: ${userId}`);
      delete userSocketMap[userId];
      io.emit("onlineUsers", Object.keys(userSocketMap));
    }
  });

  // Typing indicators can still use the old method as they are less critical.
  socket.on("typing", ({ receiverId }) => {
    // We emit to the receiver's private room.
    io.to(receiverId).emit("typing", { senderId: userId });
  });

  socket.on("stopTyping", ({ receiverId }) => {
    // We emit to the receiver's private room.
    io.to(receiverId).emit("stopTyping", { senderId: userId });
  });

  // --- WebRTC Signaling --- 
  socket.on('webrtc-signal', ({ recipientId, senderId, signalData }) => {
    console.log(`Forwarding WebRTC signal from ${senderId} to ${recipientId}`);
    io.to(recipientId).emit('webrtc-signal', { senderId, signalData });
  });
});

// We no longer need getSocketId for messaging, so it's removed from export.
export { io, app, server };