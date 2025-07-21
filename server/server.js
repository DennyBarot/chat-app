import dotenv from 'dotenv';
dotenv.config();
console.log("All env vars starting with CLIENT_:", Object.keys(process.env).filter(key => key.startsWith("CLIENT_")).map(key => ({ [key]: process.env[key] })));

import {app, server} from './socket/socket.js';
import express from "express";
import { connectDB } from "./db/connection1db.js";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import userRoute from './routes/user.route.js'
import messageRoute from './routes/message.routes.js'
import { errorMiddleware } from './middlewares/errorMiddleware.js';
connectDB();

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

app.use(cors({
  origin: trimTrailingSlash(process.env.CLIENT_URL) || 'https://chat-app-frontend-ngqc.onrender.com', // Use the environment variable or a default value
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));  

app.use(express.json({ limit: '10mb' })); 
app.use(cookieParser());

// Fallback route to handle polling requests on frontend domain
app.get('/socket.io/*', (req, res) => {
  res.status(200).send('Polling fallback route');
});

const PORT = process.env.PORT || 5000;

app.use('/api/v1/user', userRoute)
app.use('/api/v1/message', messageRoute)
app.use(errorMiddleware);
console.log("CLIENT_URL:", process.env.CLIENT_URL);
server.listen(PORT, () => {
  console.log(`your server listening at port ${PORT}`);
});
