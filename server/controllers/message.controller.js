import mongoose from "mongoose";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import { getSocketId, io } from '../socket/socket.js';

export const sendMessage = asyncHandler(async (req, res, next) => {
  const receiverId = req.params.receiverId;
  const senderId = req.user._id;
  let { message, replyTo } = req.body;

  console.log('=== SEND MESSAGE DEBUG ===');
  console.log('Receiver ID:', receiverId);
  console.log('Sender ID:', senderId);
  console.log('Message:', message);
  console.log('Reply To:', replyTo);
  console.log('User from auth:', req.user);
  console.log('Body:', req.body);

  if (!senderId || !receiverId || !message) {
    return next(new errorHandler("All fields are required.", 400));
  }

  // Add validation for ObjectId
  if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
    return next(new errorHandler("Invalid sender or receiver ID.", 400));
  }

  // Validate replyTo message existence
  if (replyTo) {
    const existingReplyMessage = await Message.findById(replyTo);
    if (!existingReplyMessage) {
      replyTo = null; // Set to null if the referenced message does not exist
    }
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (!conversation) {
    conversation = new Conversation({
      participants: [senderId, receiverId],
    });
  }

  const newMessage = new Message({
    senderId,
    receiverId,
    conversationId: conversation._id,
    content: message,
    replyTo,
    readBy: [senderId],
  });
  await newMessage.save();

  conversation.messages.push(newMessage._id);
  conversation.updatedAt = new Date(); // Ensure updatedAt is fresh
  await conversation.save();

   const populatedMessage = await Message.findById(newMessage._id)
    .populate('replyTo')
    .populate('senderId', 'fullName username avatar')
    .lean();

  const receiverSocketId = getSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", populatedMessage);
  } else {
    // Optionally: Log or queue for offline users
    console.warn('Receiver not connected:', receiverId);
  }

  res.status(200).json({
    success: true,
    responseData: populatedMessage,
  });
});

export const getConversations = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  if (!userId) {
    return next(new errorHandler("User ID is required", 400));
  }

  // Optimized: fetch messages once, then project
  const conversations = await Conversation.aggregate([
    { $match: { participants: userId } },
    { $sort: { updatedAt: -1 } },
    // --- Join messages, limit to 1 (latest), then join users
    {
      $lookup: {
        from: 'messages',
        let: { convId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$conversationId', '$$convId'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          {
            $lookup: {
              from: 'users',
              localField: 'senderId',
              foreignField: '_id',
              as: 'sender',
            },
          },
          { $unwind: '$sender' },
          {
            $project: {
              content: 1,
              createdAt: 1,
              readBy: 1,
              sender: { fullName: 1, username: 1, avatar: 1 }
            }
          }
        ],
        as: 'lastMessage',
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'participants',
        foreignField: '_id',
        as: 'participants',
        pipeline: [
          {
            $project: {
              password: 0,
              email: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            }
          }
        ]
      }
    },
    // --- Unread count for this user (not marked as read)
    {
      $lookup: {
        from: 'messages',
        let: { convId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$conversationId', '$$convId'] } } },
          {
            $project: {
              readBy: 1,
              senderId: 1,
            }
          }
        ],
        as: 'allMessages'
      }
    },
    {
      $addFields: {
        unreadCount: {
          $size: {
            $filter: {
              input: '$allMessages',
              as: 'msg',
              cond: {
                $and: [
                  { $ne: ['$$msg.senderId', userId] },
                  { $not: { $in: [userId, { $ifNull: ['$$msg.readBy', []] }] } }
                ]
              }
            }
          }
        }
      }
    },
    {
      $project: {
        allMessages: 0, // Remove the temporary array
      }
    }
  ]);

  res.status(200).json({
    success: true,
    responseData: conversations,
  });
});


export const getMessages = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const otherParticipantId = req.params.otherParticipantId;

  if (!userId || !otherParticipantId) {
    return next(new errorHandler("User ID and other participant ID are required", 400));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;


  const conversation = await Conversation.findOne({
    participants: { $all: [userId, otherParticipantId] },
  });

  if (!conversation) {
    return res.status(200).json([]);
  }

  const messages = await Message.find({ conversationId: conversation._id })
    .populate({
      path: 'replyTo',
      populate: { path: 'senderId', select: 'fullName username' }
    })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
  res.json(messages);
});

export const markMessagesRead = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  const result = await Message.updateMany(
    { conversationId, readBy: { $ne: userId }, senderId: { $ne: userId } }, // Only mark others' messages as read
    { $addToSet: { readBy: userId } }
  );

  res.status(200).json({ success: true });
});