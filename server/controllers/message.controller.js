import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import {getSocketId, io, userSocketMap} from '../socket/socket.js';

export const sendMessage = asyncHandler(async (req, res, next) => {
  const receiverId = req.params.receiverId;
  const senderId = req.user._id;
  const message = req.body.message;
  const timestamp = req.body.timestamp;
  const replyTo = req.body.replyTo; // <-- get replyTo

  console.log("sendMessage req.body:", req.body);
  console.log("sendMessage req.user:", req.user);

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
      timestamp,
      replyTo,
      readBy: [senderId],
  });

  // Populate replyTo for frontend
  const populatedMessage = await Message.findById(newMessage._id).populate('replyTo');

  const createdAt = newMessage.createdAt;

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

  console.log("sendMessage: receiverId:", receiverId);
  console.log("sendMessage: current userSocketMap keys:", Object.keys(userSocketMap));
  const socketId = getSocketId(receiverId)
  console.log("sendMessage: Emitting newMessage to socketId:", socketId);
  io.to(socketId).emit("newMessage", newMessage);

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
    let conversations = await Conversation.find({
        participants: userId,
    })
    .populate({
        path: "participants",
        select: "username fullName email avatar",
    })
    .populate({
        path: "messages",
        options: { sort: { createdAt: -1 } },
        perDocumentLimit: 1, 
        populate: { path: 'readBy', select: '_id' },
    })
    .sort({ updatedAt: -1 });

    // Manually calculate unread count for each conversation
    const conversationsWithUnreadCount = await Promise.all(conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
            conversationId: conv._id,
            readBy: { $ne: userId }
        });
        return {
            ...conv.toObject(),
            unreadCount
        };
    }));

    res.status(200).json({
        success: true,
        responseData: conversationsWithUnreadCount,
    });
});

export const createMessage = async (req, res) => {
  const { content, senderId, replyTo } = req.body;
  let quotedContent = '';
  if (replyTo) {
    const quotedMsg = await Message.findById(replyTo);
    if (quotedMsg) quotedContent = quotedMsg.content;
  }
  const message = new Message({ content, senderId, replyTo, quotedContent });
  await message.save();
  res.status(201).json(message);
};

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
  await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  res.status(200).json({ success: true });
});