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
  });

  // Populate replyTo for frontend
  const populatedMessage = await Message.findById(newMessage._id).populate('replyTo');

  const createdAt = newMessage.createdAt;

  if (newMessage) {
      conversation.messages.push(newMessage._id);
      await conversation.save();
      
      await Conversation.findByIdAndUpdate(conversation._id, {
  $inc: { [`unreadCounts.${receiverId}`]: 1 }
});
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
    })
    .sort({ updatedAt: -1 });

    res.status(200).json({
        success: true,
        responseData: conversations.map(conv => ({
            ...conv.toObject(),
            unreadCount: conv.unreadCounts?.get(userId.toString()) || 0
        }))
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
    });

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

export const markConversationRead = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const conversationId = req.params.conversationId;

    if (!userId || !conversationId) {
        return next(new errorHandler("User ID and conversation ID are required", 400));
    }

    await Conversation.findByIdAndUpdate(
        conversationId,
        { $set: { [`unreadCounts.${userId}`]: 0 } }
    );

    res.status(200).json({
        success: true,
        message: "Conversation marked as read"
    });
});
