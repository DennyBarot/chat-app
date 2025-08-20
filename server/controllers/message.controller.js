import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import {getSocketId, io, userSocketMap} from '../socket/socket.js';

export const sendMessage = asyncHandler(async (req, res, next) => {
  const receiverId = req.params.receiverId;
  const senderId = req.user._id;
  const message = req.body.message;
  const replyTo = req.body.replyTo; // <-- get replyTo

  if (!senderId || !receiverId || !message) {
      return next(new errorHandler("any field is missing.", 400));
  }

  let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
  });

  if (!conversation) {
      conversation = new Conversation({
          participants: [senderId, receiverId],
      });
      await conversation.save(); 
  }

  const newMessage = await Message.create({
      senderId,
      receiverId,
      conversationId: conversation._id,
      content: message, // <-- fix here
      replyTo,
      readBy: [senderId],
  });

  // Populate replyTo for frontend
  const populatedMessage = await Message.findById(newMessage._id).populate('replyTo');

  if (newMessage) {
      conversation.messages.push(newMessage._id);
      await conversation.save();
  }
  const receiverSocketId = getSocketId(receiverId);
  const senderSocketId = getSocketId(senderId);

  
  if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
  }
  if (senderSocketId && senderSocketId !== receiverSocketId) {
      io.to(senderSocketId).emit("newMessage", populatedMessage);
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

    const conversations = await Conversation.aggregate([
        {
            $match: {
                participants: userId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "participants",
                foreignField: "_id",
                as: "participantDetails",
            },
        },
        {
            $lookup: {
                from: "messages",
                localField: "_id",
                foreignField: "conversationId",
                as: "messages",
            },
        },
        {
            $addFields: {
                otherParticipants: {
                    $filter: {
                        input: "$participantDetails",
                        as: "participant",
                        cond: { $ne: ["$participant._id", userId] },
                    },
                },
                lastMessage: {
                    $arrayElemAt: [
                        {
                            $sortArray: {
                                input: "$messages",
                                sortBy: { createdAt: -1 },
                            },
                        },
                        0,
                    ],
                },
                unreadCount: {
                    $size: {
                        $filter: {
                            input: "$messages",
                            as: "message",
                            cond: {
                                $and: [
                                    { $ne: ["$message.senderId", userId] },
                                    { $not: { $in: [userId, "$message.readBy"] } },
                                ],
                            },
                        },
                    },
                },
            },
        },
        {
            $project: {
                _id: 1,
                participants: "$otherParticipants",
                lastMessage: 1,
                unreadCount: 1,
                updatedAt: 1,
                createdAt: 1,
            },
        },
        {
            $sort: {
                "lastMessage.createdAt": -1,
            },
        },
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

  // Find conversation between the two participants
  const conversation = await Conversation.findOne({
    participants: { $all: [userId, otherParticipantId] },
  });

  if (!conversation) {
    // No conversation found, return empty array
    return res.status(200).json([]);
  }

  const messages = await Message.find({ conversationId: conversation._id })
    .populate({
      path: 'replyTo',
      populate: { path: 'senderId', select: 'fullName username' }
    })
    .sort({ createdAt: 1 }); // Sort by createdAt ascending (oldest first)

  const formatted = messages.map(msg => ({
    ...msg.toObject(),
    quotedMessage: msg.replyTo ? {
      content: msg.replyTo.content || '[No content]',
      senderName: (msg.replyTo.senderId?.fullName || msg.replyTo.senderId?.username || 'Unknown'),
      replyTo: msg.replyTo.replyTo,
    } : null,
  }));
  res.json(formatted);
});

export const markMessagesRead = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  // Find all unread messages in this conversation
  const updatedMessages = await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } },
    { new: true } // Return the updated documents
  );

  // Get the actual messages that were updated to emit their IDs
  const messagesThatWereRead = await Message.find({ conversationId, readBy: userId });
  const messageIds = messagesThatWereRead.map(msg => msg._id);

  // Emit messagesRead event to the sender of the messages
  // This assumes the sender is the other participant in a 1-on-1 chat
  // For group chats, you might need to iterate through all senders of the unread messages
  const conversation = await Conversation.findById(conversationId);
  if (conversation) {
    const otherParticipantId = conversation.participants.find(p => p.toString() !== userId.toString());
    if (otherParticipantId) {
      const senderSocketId = getSocketId(otherParticipantId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messagesRead', {
          messageIds: messageIds,
          readBy: userId,
          readAt: new Date()
        });
      }
    }
  }

  res.status(200).json({ success: true });
});