import { errorHandler } from "../utilities/errorHandlerUtility.js";
import jwt from 'jsonwebtoken';
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {
const token = req.cookies.token || req.headers["authorization"]?.replace("Bearer ", "");
    if (!token) {
        return next(new errorHandler(401, "Not authorized"));
    }
let tokenData;
try {
    tokenData = jwt.verify(token, process.env.JWT_SECRET);
} catch (error) {
    return next(new errorHandler(401, "Invalid token"));
}
    req.user = tokenData;

    next()
  });
