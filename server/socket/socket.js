import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
  },
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
});

const getSocketId = (userId) =>{
    return userSocketMap[userId];
}

