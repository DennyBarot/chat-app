import dotenv from 'dotenv';
dotenv.config();
import {app, server} from './socket/socket.js';
import express from "express";
import { connectDB } from "./db/connection1db.js";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import userRoute from './routes/user.route.js'
import messageRoute from './routes/message.routes.js'
import { errorMiddleware } from './middlewares/errorMiddleware.js';
connectDB();

app.use(cors({
  origin: process.env.CLIENT_URL || 'https://chat-app-frontend-ngqc.onrender.com', // Use the environment variable or a default value
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true 
}));  

app.use(express.json({ limit: '10mb' })); 
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.use('/api/v1/user', userRoute)
app.use('/api/v1/message', messageRoute)
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`your server listening at port ${PORT}`);
});
