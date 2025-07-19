import dotenv from 'dotenv';
dotenv.config();

console.log("All env vars starting with CLIENT_:", Object.keys(process.env).filter(key => key.startsWith("CLIENT_")).map(key => ({ [key]: process.env[key] })));

import { app, server } from './socket/socket.js';
import express from "express";
import { connectDB } from "./db/connection1db.js";
import cookieParser from 'cookie-parser';
import cors from 'cors';

import userRoute from './routes/user.route.js';
import messageRoute from './routes/message.routes.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';

connectDB();

// ✅ CORS setup — allow both production and preview domains
const allowedOrigins = [
  "https://chat-app-tau-ecru.vercel.app", // your main frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || /^https:\/\/chat-.*\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS Not Allowed: " + origin));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.use('/api/v1/user', userRoute);
app.use('/api/v1/message', messageRoute);
app.use(errorMiddleware);

console.log("CLIENT_URL:", process.env.CLIENT_URL);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
