import dotenv from 'dotenv';
dotenv.config();

import {app, server} from './socket/socket.js';
import express from "express";
import { connectDB } from "./db/connection1db.js";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import userRoute from './routes/user.route.js'
import messageRoute from './routes/message.routes.js'
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import { trimTrailingSlash } from './utilities/stringUtils.js';
import mongoose from 'mongoose';

connectDB();

app.use(cors({
  origin: trimTrailingSlash(process.env.CLIENT_URL),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));  

app.use(express.json({ limit: '10mb' })); 
app.use(cookieParser());
app.use(mongoSanitize()); // Add this line for input sanitization

const PORT = process.env.PORT || 5000;

app.use('/api/v1/user', userRoute)
app.use('/api/v1/message', messageRoute)
app.use(errorMiddleware);

const httpServer = server.listen(PORT, () => {
  console.log(`your server listening at port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});