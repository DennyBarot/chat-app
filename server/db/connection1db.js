import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const MONGODB_URL = process.env.MONGODB_URI;
    if (!MONGODB_URL) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    // Connect without deprecated options
    await mongoose.connect(MONGODB_URL);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);

    // Listen for connection events
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to DB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("Mongoose disconnected from DB");
    });

    // Close connection on app termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("Mongoose connection closed due to app termination");
      process.exit(0);
    });

  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
};
