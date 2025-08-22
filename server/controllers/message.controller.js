import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import {getSocketId, io, userSocketMap} from '../socket/socket.js';

export const sendMessage = asyncHandler(async (req, res, next) => {
  const receiverId = req.params.receiverId;
  const senderId = req.user._id;
  const message = req.body.message;
  const replyTo = req.body.replyTo;

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
      content: message,
      replyTo,
      readBy: [senderId],
  });

  if (newMessage) {
      conversation.messages.push(newMessage._id);
      await conversation.save();
  }

  // Populate the newly created message for socket emission
  const populatedMessage = await Message.findById(newMessage._id)
    .populate('replyTo')
    .populate({
      path: 'replyTo',
      populate: { path: 'senderId', select: 'fullName username' }
    });

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

    const conversations = await Conversation.aggregate([
        {
            $match: {
                participants: userId
            }
        },
        {
            $lookup: {
                from: "users", // The collection name for the User model
                localField: "participants",
                foreignField: "_id",
                as: "participantDetails"
            }
        },
        {
            $lookup: {
                from: "messages", // The collection name for the Message model
                localField: "messages",
                foreignField: "_id",
                as: "messageDetails"
            }
        },
        {
            $addFields: {
                lastMessage: { $arrayElemAt: ["$messageDetails", { $subtract: [ { $size: "$messageDetails" }, 1 ] }] }
            }
        },
        {
            $project: {
                _id: 1,
                participants: {
                    $filter: {
                        input: "$participantDetails",
                        as: "participant",
                        cond: { $ne: ["$participant._id", userId] }
                    }
                },
                lastMessage: {
                    _id: "$lastMessage._id",
                    content: "$lastMessage.content",
                    senderId: "$lastMessage.senderId",
                    createdAt: "$lastMessage.createdAt",
                    readBy: "$lastMessage.readBy"
                },
                updatedAt: 1,
                createdAt: 1,
                unreadCount: {
                    $size: {
                        $filter: {
                            input: "$messageDetails",
                            as: "msg",
                            cond: {
                                $and: [
                                    { $ne: ["$msg.senderId", userId] },
                                    { $not: { $in: [userId, "$msg.readBy"] } }
                                ]
                            }
                        }
                    }
                }
            }
        },
        {
            $sort: { updatedAt: -1 }
        }
    ]);

    const formattedConversations = conversations.map(conv => {
        const otherParticipants = conv.participants.map(p => ({
            _id: p._id,
            username: p.username,
            fullName: p.fullName,
            avatar: p.avatar
        }));

        return {
            _id: conv._id,
            participants: otherParticipants,
            lastMessage: conv.lastMessage,
            updatedAt: conv.updatedAt,
            createdAt: conv.createdAt,
            unreadCount: conv.unreadCount,
        };
    });

    res.status(200).json({
        success: true,
        responseData: formattedConversations,
    });
});