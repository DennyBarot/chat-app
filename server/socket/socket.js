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
const callTimeouts = {}; // Track call timeouts by caller ID

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

  // Call events with timeout handling
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    console.log(`Call initiated: from ${from} to ${userToCall}`);
    
    // Check if user is online before initiating call
    if (!userSocketMap[userToCall]) {
      console.log(`Call failed: User ${userToCall} is offline`);
      socket.emit("callFailed", { reason: "User is offline" });
      return;
    }

    console.log(`Forwarding call to user ${userToCall}`);
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
    
    // Set timeout to auto-reject call after 30 seconds
    callTimeouts[from] = setTimeout(() => {
      console.log(`Call timeout: User ${userToCall} did not answer call from ${from}`);
      io.to(userToCall).emit("callEnded", { reason: "Call timeout" });
      socket.emit("callFailed", { reason: "No answer" });
      delete callTimeouts[from];
    }, 30000);
  });

  socket.on("answerCall", (data) => {
    console.log(`Call answered: to ${data.to}`);
    // Clear timeout if call is answered
    if (callTimeouts[data.to]) {
      clearTimeout(callTimeouts[data.to]);
      delete callTimeouts[data.to];
      console.log(`Cleared timeout for call from ${data.to}`);
    }
    io.to(data.to).emit("callAccepted", data.signal);
    console.log(`Call accepted signal sent to ${data.to}`);
  });

  socket.on("callEnded", ({ to, reason }) => {
    console.log(`Call ended: to ${to}, reason: ${reason}`);
    // Clear timeout if call is ended
    if (callTimeouts[to]) {
      clearTimeout(callTimeouts[to]);
      delete callTimeouts[to];
      console.log(`Cleared timeout for call from ${to}`);
    }
    io.to(to).emit("callEnded", { reason: reason || "Call ended by user" });
  });

  socket.on("callRejected", ({ to }) => {
    console.log(`Call rejected: to ${to}`);
    // Clear timeout if call is rejected
    if (callTimeouts[to]) {
      clearTimeout(callTimeouts[to]);
      delete callTimeouts[to];
      console.log(`Cleared timeout for call from ${to}`);
    }
    io.to(to).emit("callEnded", { reason: "Call rejected" });
  });

  socket.on("callFailed", ({ reason }) => {
    console.log(`Call failed: ${reason}`);
  });
});

// We no longer need getSocketId for messaging, so it's removed from export.
export { io, app, server };