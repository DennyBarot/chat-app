import User from '../models/userModel.js';
import { asyncHandler } from '../utilities/asyncHandlerUtility.js';
import { errorHandler } from '../utilities/errorHandlerUtility.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { transporter, mailOptions } from '../utilities/email.js';

// Register a new user
export const register = asyncHandler(async (req, res, next) => {
  const { username, fullName, email, password, gender } = req.body;

  // Validate required fields
  if (!fullName || !username || !email || !password || !gender) {
    return next(errorHandler(400, "All fields are required."));
  }

  // Check for existing user
  const user = await User.findOne({ email });
  if (user) {
    return next(errorHandler(400, "User already exists"));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate avatar based on gender
  const avatarType = gender.toLowerCase() === "male" ? "boy" : "girl";
  const avatar = `https://avatar.iran.liara.run/public/${avatarType}?username=${username}`;

  // Create and save user
  const newUser = await User.create({
    username,
    fullName,
    email,
    password: hashedPassword,
    gender: gender.toLowerCase(),
    avatar,
  });

  // Generate JWT token
  const token = jwt.sign(
    { _id: newUser._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES }
  );

  // Set secure cookie and send response
  res
    .status(200)
    .cookie("token", token, {
      expires: new Date(Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    })
    .json({
      success: true,
      responseData: { newUser, token },
    });
});

// Login an existing user
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

  const token = jwt.sign(
    { _id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES }
  );

  res
    .status(200)
    .cookie("token", token, {
      expires: new Date(Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: true,
      sameSite: "None",
    })
    .json({
      success: true,
      responseData: { user, token },
    });
});

// Send password reset link
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(errorHandler(400, "Email is required"));
  }

  const frontendUrl = process.env.FRONTEND_URL || "https://chat-app-frontend-ngqc.onrender.com";
  try {
    await transporter.sendMail({
      ...mailOptions,
      to: email,
      text: `Please use the following link to reset your password: ${frontendUrl}/reset-password`,
      html: `<p>Click <a style="color: blue" href='${frontendUrl}/reset-password?email=${email}'>here</a> to reset your password.</p>`,
    });
    res.status(200).json({
      success: true,
      message: "Password reset link sent successfully",
    });
  } catch (error) {
    return next(errorHandler(500, "Failed to send email. Please try again later."));
  }
});

// Reset user password
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(errorHandler(400, "Email and password are required"));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(errorHandler(400, "User not found"));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

// Get user profile
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

// Update user profile (avatar, username, fullName)
export const updateProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { fullName, username, avatar } = req.body;

  // At least one field must be provided
  if (!userId || (!fullName && !username && !avatar)) {
    return next(errorHandler(400, "User ID is required and at least one field must be provided"));
  }

  // Validate unique username
  if (username) {
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== userId) {
      return next(errorHandler(400, "Username already exists"));
    }
  }

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (username) updateData.username = username;
  if (avatar) updateData.avatar = avatar;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true }
  );

  res.status(200).json({
    success: true,
    responseData: updatedUser,
  });
});

// Logout user (clear cookie)
export const logout = asyncHandler(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    })
    .json({
      success: true,
      message: "Logout successful!",
    });
});

// Get all other users (except self)
export const getOtherUsers = asyncHandler(async (req, res, next) => {
  const otherUsers = await User.find({ _id: { $ne: req.user._id } });
  res.status(200).json({
    success: true,
    responseData: otherUsers,
  });
});

// Get all users (including self)
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const allUsers = await User.find({});
  res.status(200).json({
    success: true,
    responseData: allUsers,
  });
});
