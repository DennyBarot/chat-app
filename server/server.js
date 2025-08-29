import dotenv from 'dotenv';
dotenv.config();

import {app, server} from './socket/socket.js';
import express from "express";
import { connectDB } from "./db/connection1db.js";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import userRoute from './routes/user.route.js'
import messageRoute from './routes/message.routes.js'
import conversationRoute from './routes/conversation.routes.js'
import callRoute from './routes/call.routes.js'
import { errorMiddleware } from './middlewares/errorMiddleware.js';
connectDB();

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

app.use(cors({
  origin: trimTrailingSlash(process.env.CLIENT_URL),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));  

app.use(express.json({ limit: '10mb' })); 
app.use(cookieParser());
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  createParentPath: true
}));


const PORT = process.env.PORT || 5000;

app.use('/api/v1/user', userRoute)
app.use('/api/v1/message', messageRoute)
app.use('/api/v1/conversation', conversationRoute)
app.use('/api/v1/call', callRoute)
app.use(errorMiddleware);
console.log("CLIENT_URL:", process.env.CLIENT_URL);
server.listen(PORT, () => {
  console.log(`your server listening at port ${PORT}`);
});
