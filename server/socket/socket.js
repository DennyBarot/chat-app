import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from '../models/messageModel.js';
import Conversation from '../models/conversationModel.js';


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

const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  // console.log("Socket connected:", socket.id, "UserId:", userId);

   if (!userId) {
    socket.disconnect(true);
    return;
  }
    userSocketMap[userId] = userSocketMap[userId] || [];
    userSocketMap[userId].push(socket.id);
  // console.log("UserSocketMap updated:", userSocketMap);

  io.emit("onlineUsers", Object.keys(userSocketMap))

    // Join this user's current conversation rooms (fetch from DB)
  const conversations = await Conversation.find({ participants: userId });
  conversations.forEach(conv => {
    socket.join(conv._id.toString());
  });

    socket.on("disconnect", () => {
    if (!userSocketMap[userId]) return;
    userSocketMap[userId] = userSocketMap[userId].filter(id => id !== socket.id);
    if (userSocketMap[userId].length === 0) {
      delete userSocketMap[userId];
    }
    io.emit("onlineUsers", Object.keys(userSocketMap));
  });
  
  

  socket.on('sendMessage', async ({ content, senderId, replyTo }) => {
    let quotedContent = '';
    if (replyTo) {
      const quotedMsg = await Message.findById(replyTo);
      if (quotedMsg) quotedContent = quotedMsg.content;
    }
    const message = new Message({ content, senderId, replyTo, quotedContent,conversationId  });
    await message.save();
    io.to(conversationId).emit('newMessage', message);
  });
});

const getSocketIds = (userId) => userSocketMap[userId] || [];

export { io, app, server, getSocketIds, userSocketMap };

