import User from '../models/userModel.js';
import { asyncHandler } from '../utilities/asyncHandlerUtility.js';
import { errorHandler } from '../utilities/errorHandlerUtility.js';
import bcrypt from 'bcryptjs';
import { transporter, mailOptions } from '../utilities/email.js';
import { sendToken } from '../utilities/tokenUtility.js';
import crypto from 'crypto';

export const register = asyncHandler(async (req, res, next) => {
  const { username, fullName, email, password, gender } = req.body;
  if (!fullName || !username || !email || !password || !gender) {
    return next(errorHandler(400, "All fields are required."));
  }

  const existingUserByEmail = await User.findOne({ email });
  if (existingUserByEmail) {
    return next(errorHandler(400, "User with this email already exists"));
  }

  const existingUserByUsername = await User.findOne({ username });
  if (existingUserByUsername) {
    return next(errorHandler(400, "User with this username already exists"));
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const avatarType = gender.toLowerCase() === "male" ? "boy" : "girl";

  const avatar = `https://avatar.iran.liara.run/public/${avatarType}?username=${username}`;

  const newUser = await User.create({
    username,
    fullName,
    email,
    password: hashedPassword,
    gender: gender.toLowerCase(),
    avatar,
  });

  sendToken(res, newUser, 200, "User registered successfully");
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(errorHandler(400, "Email and Password are required."));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(errorHandler(400, "Enter valid Email or Password"));
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return next(errorHandler(400, "Enter valid Email or Password"));
  }

  sendToken(res, user, 200, "User logged in successfully");
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(errorHandler(400, "Email is required"));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(errorHandler(400, "User not found"));
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  const hashedResetToken = await bcrypt.hash(resetToken, 10); // Hash the token with bcrypt
  user.resetPasswordToken = hashedResetToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || 'https://chat-app-frontend-ngqc.onrender.com';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    ...mailOptions,
    to: email,
    subject: 'Password Reset Request',
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`,
    html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p><p>Please click on the following link, or paste this into your browser to complete the process:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
  });

  res.status(200).json({
    success: true,
    message: "Password reset link sent successfully",
  });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params; // Get the plain token from params
  const { password } = req.body;

  if (!token || !password) {
    return next(errorHandler(400, "Token and password are required"));
  }

  const user = await User.findOne({
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(errorHandler(400, "Invalid or expired reset token"));
  }

  const isTokenValid = await bcrypt.compare(token, user.resetPasswordToken); // Compare plain token with hashed token

  if (!isTokenValid) {
    return next(errorHandler(400, "Invalid or expired reset token"));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

export const getProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  if (!userId) {
    return next(errorHandler(400, "User ID is required"));
  }
  const profile = await User.findById(userId);

  res.status(200).json({
    success: true,
    responseData: profile,
  });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { fullName, username, avatar } = req.body;

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (username) updateData.username = username;
  if (avatar) {
    // Basic URL validation
    const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    if (!urlRegex.test(avatar)) {
      return next(errorHandler(400, "Invalid avatar URL format"));
    }
    updateData.avatar = avatar;
  }

  if (!userId || (!fullName && !username && !avatar)) {
    return next(errorHandler(400, "User ID is required and at least one field must be provided"));
  }

  if (username) {
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== userId) {
      return next(errorHandler(400, "Username already exists"));
    }
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

  res.status(200).json({
    success: true,
    responseData: updatedUser,
  });
});

export const logout = asyncHandler(async (req, res, next) => {
  res.status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "None",
    })
    .json({
      success: true,
      message: "Logout successful!",
    });
});

export const getOtherUsers = asyncHandler(async (req, res, next) => {
  const otherUsers = await User.find({ _id: { $ne: req.user._id } });
  res.status(200).json({
    success: true,
    responseData: otherUsers,
  });
});

export const getAllUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const allUsers = await User.find({}).skip(skip).limit(limit);
  const totalUsers = await User.countDocuments({});

  res.status(200).json({
    success: true,
    responseData: {
      users: allUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    },
  });
});