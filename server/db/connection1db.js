import mongoose from "mongoose";

export const connectDB = async () => {
const MONGODB_URL = process.env.MONGODB_URI;

   try {
    const instance = await mongoose.connect(MONGODB_URL);
    console.log(`MongoDB Connected: ${instance.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit process with failure
  }
};
