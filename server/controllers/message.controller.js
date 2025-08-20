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