import mongoose, {mongo} from "mongoose";

export const connectDB = async () => {
const MONGODB_URL = process.env.MONGODB_URI;

   const instance = await mongoose.connect(MONGODB_URL);

   console.log(`MongoDB Connected: ${instance.connection.host}`);
}
