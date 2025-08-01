import { errorHandler } from "../utilities/errorHandlerUtility.js";
import jwt from 'jsonwebtoken';
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {
const header = req.headers["authorization"];
const token = req.cookies.token || (header && header.replace(/^Bearer\s+/i, ''));
console.log("Token received:", token); 
    if (!token) {
        
        return next(new errorHandler(401, "Not authorized"));
    }
let tokenData;
try {
    tokenData = jwt.verify(token, process.env.JWT_SECRET);
} catch (error) {
    console.error("JWT verification error:", error);
    return next(new errorHandler(401, "Invalid token"));
}
    req.user = tokenData;
    console.log("Token Data:", tokenData); 

    next()
  });
