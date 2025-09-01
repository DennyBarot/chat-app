import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/userModel.js";

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

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined") {
    console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);
    userSocketMap[userId] = socket.id;
    
    // Update user status to online and set last seen to now
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error("Error updating user online status:", error);
    }
    
    // --- THE CRUCIAL CHANGE ---
    // The user joins a room named after their own user ID. This is very reliable.
    socket.join(userId);

    // Emit the list of online user IDs to everyone.
    io.emit("onlineUsers", Object.keys(userSocketMap));
    
    // Emit user status update to all clients
    io.emit("userStatusUpdate", {
      userId,
      isOnline: true,
      lastSeen: new Date()
    });
  }

  socket.on("disconnect", async () => {
    if (userId && userId !== "undefined") {
      console.log(`User disconnected: ${userId}`);
      delete userSocketMap[userId];
      
      // Update user status to offline and set last seen to now
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error("Error updating user offline status:", error);
      }
      
      io.emit("onlineUsers", Object.keys(userSocketMap));
      
      // Emit user status update to all clients
      io.emit("userStatusUpdate", {
        userId,
        isOnline: false,
        lastSeen: new Date()
      });
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

  // Voice recording/call status events
  socket.on("voiceRecordingStart", ({ receiverId }) => {
    io.to(receiverId).emit("voiceRecordingStatus", {
      senderId: userId,
      status: "recording"
    });
  });

  socket.on("voiceRecordingStop", ({ receiverId }) => {
    io.to(receiverId).emit("voiceRecordingStatus", {
      senderId: userId,
      status: "stopped"
    });
  });

  // Call signaling events
  socket.on("call-user", ({ userToCall, signal, from, name }) => {
    console.log(`Call initiated from ${from} to ${userToCall}`);
    console.log(`Emitting call-user to room: ${userToCall}`);
    io.to(userToCall).emit("call-user", { signal, from, name });
  });

  socket.on("answer-call", (data) => {
    console.log(`Call answered by ${userId} to ${data.to}`);
    console.log(`Emitting call-accepted to room: ${data.to}`);
    io.to(data.to).emit("call-accepted", { signal: data.signal });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    console.log(`ICE candidate sent from ${userId} to ${to}`);
    // Forward the candidate to the other user, including who it is from.
    io.to(to).emit("ice-candidate", { candidate, from: userId });
  });

  socket.on("end-call", ({ to }) => {
    console.log(`Call ended by ${userId} to ${to}`);
    console.log(`Emitting end-call to room: ${to}`);
    io.to(to).emit("end-call");
  });

  socket.on("reject-call", ({ to }) => {
    console.log(`Call rejected by ${userId} to ${to}`);
    console.log(`Emitting call-rejected to room: ${to}`);
    io.to(to).emit("call-rejected");
  });

});

// We no longer need getSocketId for messaging, so it's removed from export.
export { io, app, server };
