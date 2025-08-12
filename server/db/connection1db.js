import mongoose from "mongoose";

export const connectDB = async () => {
  const MONGODB_URL = process.env.MONGODB_URI;

  try {
    const instance = await mongoose.connect(MONGODB_URL, {
      minPoolSize: 5,  // Maintain a minimum of 5 socket connections
      maxPoolSize: 10, // Maintain a maximum of 10 socket connections
    });
    console.log(`MongoDB Connected: ${instance.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};