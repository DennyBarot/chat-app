import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import { getSocketId, io } from '../socket/socket.js';

export const sendMessage = asyncHandler(async (req, res, next) => {
  const receiverId = req.params.receiverId;
  const senderId = req.user._id;
  let { message, replyTo } = req.body;

  if (!senderId || !receiverId || !message) {
    return next(new errorHandler("All fields are required.", 400));
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
  await conversation.save();

  const populatedMessage = await Message.findById(newMessage._id).populate('replyTo').lean();

  const receiverSocketId = getSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", populatedMessage);
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

  // Aggregation pipeline for fetching conversations.
  // This pipeline has been optimized to fetch only the latest message and calculate unread counts efficiently.
  // Further performance tuning might be necessary based on specific load testing and profiling.
  const conversations = await Conversation.aggregate([
    { $match: { participants: userId } },
    { $sort: { updatedAt: -1 } },
    {
      $lookup: {
        from: 'messages',
        localField: '_id',
        foreignField: 'conversationId',
        as: 'messages',
        pipeline: [
          { $sort: { createdAt: -1 } }, // Sort messages by creation date, newest first
          { $limit: 1 } // Get only the latest message
        ]
      }
    },
    {
      $addFields: {
        lastMessage: { $arrayElemAt: ['$messages', 0] }, // Get the first (latest) message from the limited array
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'participants',
        foreignField: '_id',
        as: 'participants'
      }
    },
    {
      $lookup: {
        from: 'messages',
        localField: '_id',
        foreignField: 'conversationId',
        as: 'allMessagesForUnreadCount' // Fetch all messages again for unread count
      }
    },
    {
      $addFields: {
        unreadCount: {
          $size: {
            $filter: {
              input: '$allMessagesForUnreadCount',
              as: 'msg',
              cond: { $not: { $in: [userId, '$$msg.readBy'] } }
            }
          }
        }
      }
    },
    {
      $project: {
        messages: 0, // Remove the limited messages array
        allMessagesForUnreadCount: 0, // Remove the full messages array used for unread count
        'participants.password': 0,
        'participants.email': 0,
        'participants.createdAt': 0,
        'participants.updatedAt': 0,
        'participants.__v': 0,
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
    .lean();

  res.json(messages);
});

export const markMessagesRead = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  res.status(200).json({ success: true });
});