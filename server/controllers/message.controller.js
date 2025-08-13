import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import { getSocketId, io, userSocketMap } from "../socket/socket.js";

// Send a message & create conversation if one doesn't exist
export const sendMessage = asyncHandler(async (req, res, next) => {
  const { receiverId } = req.params;
  const { _id: senderId } = req.user;
  const { message, timestamp, replyTo } = req.body;

  // Validation
  if (!senderId || !receiverId || !message) {
    return next(new errorHandler("Sender ID, receiver ID, or message is missing.", 400));
  }

  // Find or create conversation between users
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
    });
  }

  // Create and save the new message (mark as read by sender)
  const newMessage = await Message.create({
    senderId,
    receiverId,
    conversationId: conversation._id,
    content: message,
    timestamp,
    replyTo,
    readBy: [senderId],
  });

  // Populate replyTo for the frontend
  const populatedMessage = await Message.findById(newMessage._id)
    .populate("replyTo")
    .lean();

  // Add message to conversation and save
  conversation.messages.push(newMessage._id);
  await conversation.save();

  // Find socket IDs for both sender and receiver
  const receiverSocketId = getSocketId(receiverId);
  const senderSocketId = getSocketId(senderId);

  // Emit newMessage ONLY to the participants’ sockets
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", populatedMessage);
  }
  if (senderSocketId && senderSocketId !== receiverSocketId) {
    io.to(senderSocketId).emit("newMessage", populatedMessage);
  }

  // Return the fully populated message
  res.status(200).json({
    success: true,
    responseData: populatedMessage,
  });
});

// Fetch all conversations for a user, with unread counts
export const getConversations = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  if (!userId) {
    return next(new errorHandler("User ID is required", 400));
  }

  // Get all conversations where the user is a participant
  let conversations = await Conversation.find({
    participants: userId,
  })
    .populate({
      path: "participants",
      select: "username fullName email avatar",
    })
    .populate({
      path: "messages",
      options: { sort: { createdAt: -1 } }, // Latest message first
      perDocumentLimit: 1, // Only the latest message per convo
      populate: { path: "readBy", select: "_id" },
    })
    .sort({ updatedAt: -1 });

  // Calculate unread count for each conversation
  const conversationsWithUnreadCount = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        readBy: { $ne: userId },
      });
      return {
        ...conv.toObject(),
        unreadCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    responseData: conversationsWithUnreadCount,
  });
});

// Get messages between the current user and another participant
export const getMessages = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { otherParticipantId } = req.params;

  if (!userId || !otherParticipantId) {
    return next(
      new errorHandler("User ID and other participant ID are required", 400)
    );
  }

  // Find conversation between the two users
  const conversation = await Conversation.findOne({
    participants: { $all: [userId, otherParticipantId] },
  });

  if (!conversation) {
    return res.status(200).json([]); // No conversation yet, return empty
  }

  // Fetch all messages in the conversation, with reply info
  const messages = await Message.find({ conversationId: conversation._id })
    .populate({
      path: "replyTo",
      populate: { path: "senderId", select: "fullName username" },
    })
    .sort({ createdAt: 1 }); // Oldest first

  // Format each message with quoted content if it's a reply
  const formatted = messages.map((msg) => ({
    ...msg.toObject(),
    quotedMessage: msg.replyTo
      ? {
          content: msg.replyTo.content || "[No content]",
          senderName: msg.replyTo.senderId?.fullName || msg.replyTo.senderId?.username || "Unknown",
          replyTo: msg.replyTo.replyTo,
        }
      : null,
  }));

  res.json(formatted);
});

// Mark all unread messages in a conversation as read by the current user
export const markMessagesRead = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  res.status(200).json({ success: true });
});
// message.controller.js
export const reactToMessage = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  if (!emoji || !messageId) {
    return next(new errorHandler(400, "Emoji and messageId are required"));
  }

  const message = await Message.findById(messageId);
  if (!message) {
    return next(new errorHandler(404, "Message not found"));
  }

  // Add or remove user from this reaction
  let currentReactions = message.reactions.get(emoji) || [];
  if (currentReactions.includes(userId)) {
    // Remove reaction
    message.reactions.set(
      emoji,
      currentReactions.filter((id) => !id.equals(userId))
    );
  } else {
    // Add reaction
    message.reactions.set(emoji, [...currentReactions, userId]);
  }
  await message.save();
  
  const populated = await Message.findById(message._id).populate({
    path: "reactions.$*.0", // Populate first user for demo (optional)
    select: "fullName avatar",
  });

  // Emit real-time update
  io.to(`${message.conversationId}`).emit("messageReaction", populated);

  res.status(200).json({
    success: true,
    responseData: populated,
  });
});
