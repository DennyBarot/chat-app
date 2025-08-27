import crypto from 'crypto';
import User from '../models/userModel.js';
import { asyncHandler } from '../utilities/asyncHandlerUtility.js';
import { errorHandler } from '../utilities/errorHandlerUtility.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { transporter, mailOptions } from '../utilities/email.js';

export const register = asyncHandler(async (req, res, next) => {
  const { username, fullName, email, password, gender } = req.body;
  if (!fullName || !username || !email || !password || !gender) {
    return next(errorHandler(400, "All fields are required."));
  }

  const user = await User.findOne({ email });
  if (user) {
    return next(errorHandler(400, "User already exists"));
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const avatarType = gender.toLowerCase() === "male" ? "boy" : "girl";

  const avatar = `https://avatar.iran.liara.run/public/${avatarType}?username=${username}`;
  //yooo
  console.log("Gender value:", gender);
  const newUser = await User.create({

    username,
    fullName,
    email,
    password: hashedPassword,
    gender: gender.toLowerCase(),
    avatar,
  });

  const tokenData = {
    _id: newUser?._id
  };

  const token = jwt.sign(tokenData, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });

  res
    .status(200)
    .cookie("token", token, {
      expires: new Date(Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "None",
    })
    .json({
      success: true,
      responseData: {
        newUser,
        token,
      },
    });
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

  const tokenData = {
    _id: user?._id,
  };

  const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

  res.status(200)
    .cookie("token", token, {
      expires: new Date(Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: true,
      sameSite: "None",
    })
    .json({
      success: true,
      responseData: {
        user,
        token,
      },
    });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(errorHandler(400, "Email is required"));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(errorHandler(404, "User with this email does not exist"));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes

  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || 'https://chat-app-frontend-ngqc.onrender.com';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  try {
    await transporter.sendMail({
      ...mailOptions,
      to: email,
      subject: 'Password Reset Request',
      text: `You are receiving this email because you (or someone else) have requested the reset of a password. Please make a PUT request to: ${resetUrl}
If you did not request this, please ignore this email and your password will remain unchanged.`,
      html: `<p>You are receiving this email because you (or someone else) have requested the reset of a password.</p><p>Click <a href='${resetUrl}'>here</a> to reset your password.</p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    });

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email!",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    return next(errorHandler(500, "Error sending password reset email"));
  }
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params; // Get token from URL parameters
  const { password } = req.body;

  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(errorHandler(400, "Invalid or expired password reset token"));
  }

  if (!password) {
    return next(errorHandler(400, "New password is required"));
  }

  user.password = await bcrypt.hash(password, 10);
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
  if (fullName !== undefined) updateData.fullName = fullName;
  if (username !== undefined) updateData.username = username;
  if (avatar !== undefined) updateData.avatar = avatar;

  if (!userId || Object.keys(updateData).length === 0) {
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
    responseData: {
      user: updatedUser,
    },
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
  const allUsers = await User.find({});
  res.status(200).json({
    success: true,
    responseData: allUsers,
  });
});

// Get user status (online/offline and last seen)
export const getUserStatus = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId) {
    return next(errorHandler(400, "User ID is required"));
  }

  const user = await User.findById(userId).select('isOnline lastSeen username fullName avatar');
  
  if (!user) {
    return next(errorHandler(404, "User not found"));
  }

  res.status(200).json({
    success: true,
    responseData: {
      userId: user._id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    }
  });
});

// Get status for multiple users
export const getUsersStatus = asyncHandler(async (req, res, next) => {
  const { userIds } = req.body;
  
  if (!userIds || !Array.isArray(userIds)) {
    return next(errorHandler(400, "Array of user IDs is required"));
  }

  const users = await User.find({ _id: { $in: userIds } }).select('isOnline lastSeen username fullName avatar');
  
  const statusMap = users.reduce((acc, user) => {
    acc[user._id.toString()] = {
      userId: user._id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    };
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    responseData: statusMap
  });
});


