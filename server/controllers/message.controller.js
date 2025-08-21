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

  // Populate replyTo with sender details for frontend
  const populatedMessage = await Message.findById(newMessage._id)
    .populate('replyTo')
    .populate({
      path: 'replyTo',
      populate: { path: 'senderId', select: 'fullName username' }
    });

  if (newMessage) {
      conversation.messages.push(newMessage._id);
      await conversation.save();
  }
  const receiverSocketId = getSocketId(receiverId);
  const senderSocketId = getSocketId(senderId);

  // Format message for socket emission with complete quote data
  const formattedMessage = {
    ...populatedMessage.toObject(),
    quotedMessage: populatedMessage.replyTo ? {
      content: populatedMessage.replyTo.content || '[No content]',
      senderName: (populatedMessage.replyTo.senderId?.fullName || populatedMessage.replyTo.senderId?.username || 'Unknown'),
      replyTo: populatedMessage.replyTo.replyTo,
    } : null,
  };

  if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", formattedMessage);
  }
  if (senderSocketId && senderSocketId !== receiverSocketId) {
      io.to(senderSocketId).emit("newMessage", formattedMessage);
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

    const conversations = await Conversation.find({ participants: userId })
        .populate({
            path: "participants",
            select: "username fullName avatar",
        })
        .populate({
            path: "messages",
            options: { sort: { createdAt: -1 }, limit: 1 },
        })
        .sort({ updatedAt: -1 });

    const formattedConversations = conversations.map(conv => {
        const otherParticipants = conv.participants.filter(p => p._id.toString() !== userId.toString());
        const lastMessage = conv.messages.length > 0 ? conv.messages[0] : null;

        // For unread count, we need to query the database separately.
        // This is a simplified approach. For a more performant solution,
        // you might want to use a different strategy.
        return {
            _id: conv._id,
            participants: otherParticipants,
            lastMessage,
            updatedAt: conv.updatedAt,
            createdAt: conv.createdAt,
        };
    });

    // This part is tricky without a more complex aggregation.
    // We will fetch unread counts separately for simplicity.
    for (let i = 0; i < formattedConversations.length; i++) {
        const conv = formattedConversations[i];
        const unreadCount = await Message.countDocuments({
            conversationId: conv._id,
            senderId: { $ne: userId },
            readBy: { $nin: [userId] },
        });
        conv.unreadCount = unreadCount;
    }

    res.status(200).json({
        success: true,
        responseData: formattedConversations,
    });
});



export const getMessages = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const otherParticipantId = req.params.otherParticipantId;
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 20; // Default to 20 messages per page
  const skip = (page - 1) * limit;

  if (!userId || !otherParticipantId) {
    return next(new errorHandler("User ID and other participant ID are required", 400));
  }

  // Find conversation between the two participants
  const conversation = await Conversation.findOne({
    participants: { $all: [userId, otherParticipantId] },
  });

  if (!conversation) {
    // No conversation found, return empty array
    return res.status(200).json({ messages: [], totalMessages: 0 });
  }

  const totalMessages = await Message.countDocuments({ conversationId: conversation._id });

  const messages = await Message.find({ conversationId: conversation._id })
    .populate({
      path: 'replyTo',
      populate: { path: 'senderId', select: 'fullName username' }
    })
    .sort({ createdAt: -1 }) // Sort by createdAt descending (newest first) for fetching latest messages
    .skip(skip)
    .limit(limit);

  // Reverse the order to display oldest first in the UI
  const formattedMessages = messages.reverse().map(msg => ({
    ...msg.toObject(),
    quotedMessage: msg.replyTo ? {
      content: msg.replyTo.content || '[No content]',
      senderName: (msg.replyTo.senderId?.fullName || msg.replyTo.senderId?.username || 'Unknown'),
      replyTo: msg.replyTo.replyTo,
    } : null,
  }));

  res.json({
    messages: formattedMessages,
    totalMessages,
    currentPage: page,
    totalPages: Math.ceil(totalMessages / limit),
    hasMore: totalMessages > (page * limit),
  });
});

export const markMessagesRead = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const { conversationId } = req.params;

    // Find unread messages to get their IDs before updating
    const unreadMessages = await Message.find({
        conversationId,
        readBy: { $ne: userId },
    }).select('_id');

    const messageIdsToUpdate = unreadMessages.map(msg => msg._id);

    if (messageIdsToUpdate.length === 0) {
        return res.status(200).json({ success: true, message: "No new messages to mark as read." });
    }

    // Update messages and mark them as read
    await Message.updateMany(
        { _id: { $in: messageIdsToUpdate } },
        { $addToSet: { readBy: userId }, readAt: new Date() }
    );

    // Emit messagesRead event to the other participant
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
        const otherParticipant = conversation.participants.find(p => p.toString() !== userId.toString());
        if (otherParticipant) {
            const otherParticipantSocketId = getSocketId(otherParticipant);
            if (otherParticipantSocketId) {
                io.to(otherParticipantSocketId).emit('messagesRead', {
                    conversationId,
                    messageIds: messageIdsToUpdate,
                    readBy: userId,
                    readAt: new Date(),
                });
            }
        }
    }

    res.status(200).json({ success: true });
});