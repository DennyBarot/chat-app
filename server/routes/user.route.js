import express from 'express';
import {login, getProfile, register, logout, getOtherUsers, updateProfile, forgotPassword, resetPassword, getAllUsers} from '../controllers/user.controller.js';
import { asyncHandler } from '../utilities/asyncHandlerUtility.js';
import { errorHandler } from '../utilities/errorHandlerUtility.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();


router.post('/register',register);
router.post('/login',login);
router.post('/forgot-password',forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/get-profile',isAuthenticated,getProfile);
router.get('/get-other-users', isAuthenticated, getOtherUsers);
router.get('/get-all-users', isAuthenticated, getAllUsers);
router.put('/update-profile', isAuthenticated, updateProfile); // Add route for updating user profile
router.post('/logout', isAuthenticated, logout);
export default router;
