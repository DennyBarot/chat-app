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


  // In server/socket/socket.js
socket.on("markAsRead", ({ conversationId, userId }) => {
  // Update server unread count
  conversationId.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCounts.${userId}`]: 0 }
  });
  
  // Broadcast to other participants
  socket.to(conversationId).emit("conversationRead", { 
    conversationId, 
    userId 
  });
});

});

const getSocketId = (userId) =>{
    return userSocketMap[userId];
}

