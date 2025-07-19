import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || origin === process.env.CLIENT_URL || /^https:\/\/chat-.*\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Socket.IO CORS not allowed: " + origin));
      }
    },
    credentials: true,
  },
});

const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("Socket connected:", socket.id, "UserId:", userId);

  if (!userId) return;

  userSocketMap[userId] = socket.id;
  console.log("UserSocketMap updated:", userSocketMap);

  io.emit("onlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    console.log("Socket disconnected:", socket.id, "UserId:", userId);
    io.emit("onlineUsers", Object.keys(userSocketMap));
  });
});

const getSocketId = (userId) => userSocketMap[userId];

export { io, app, server, getSocketId, userSocketMap };
