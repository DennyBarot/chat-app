import { errorHandler } from "../utilities/errorHandlerUtility.js";
import jwt from 'jsonwebtoken';
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import User from '../models/userModel.js'; // Import the User model

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token || req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return next(new errorHandler(401, "Not authorized"));
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new errorHandler(401, "Invalid token"));
  }

  // Fetch the user from the database to ensure they still exist and are active
  const user = await User.findById(decodedToken._id);

  if (!user) {
    return next(new errorHandler(401, "User not found or account is inactive"));
  }

  req.user = user; // Attach the full user object to the request

  next();
});