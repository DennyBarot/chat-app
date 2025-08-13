import { errorHandler } from "../utilities/errorHandlerUtility.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  // Extract token from cookie or Authorization header
  const token = req.cookies.token || req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return next(new errorHandler(401, "Not authorized"));
  }

  try {
    // Verify token and attach user data to request
    const tokenData = jwt.verify(token, process.env.JWT_SECRET);
    req.user = tokenData;

    // Optional: Attach the token itself (useful for logout from all devices)
    req.token = token;

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    // Clear invalid token cookie on client if present (optional, good UX)
    res.clearCookie("token");
    next(new errorHandler(401, "Invalid or expired token"));
  }
});
