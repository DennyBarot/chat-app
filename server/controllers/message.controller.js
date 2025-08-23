import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import mongoose from 'mongoose';
import { getSocketId, io } from '../socket/socket.js';

// --- The Single, Reliable Helper Function ---
// This function will now be used by both sendMessage and markMessagesRead.
const getUpdatedConversationForUser = async (conversationId, userId) => {
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(conversationId.toString()) } },
        {
            $lookup: {
                from: "messages",
                let: { conversationId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$conversationId", "$$conversationId"] } } },
                    { $sort: { createdAt: -1 } },
                    { $limit: 1 }
                ],
                as: "lastMessage"
            }
        },
        {
            $lookup: {
                from: "messages",
                let: { conversationId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$conversationId", "$$conversationId"] },
                                    { $not: { $in: [userObjectId, { $ifNull: ["$readBy", []] }] } }
                                ]
                            }
                        }
                    },
                    { $count: "count" }
                ],
                as: "unreadMessages"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "participants",
                foreignField: "_id",
                as: "participantsInfo"
            }
        },
        {
            $project: {
                _id: 1, updatedAt: 1, createdAt: 1,
                lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
                unreadCount: { $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0] },
                participants: {
                    $filter: {
                        input: "$participantsInfo",
                        as: "participant",
                        cond: { $ne: ["$$participant._id", userObjectId] }
                    }
                }
            }
        },
        {
            $project: {
                "participants.password": 0, "participants.email": 0, "participants.gender": 0,
                "participants.createdAt": 0, "participants.updatedAt": 0,
            }
        }
    ];

    const result = await Conversation.aggregate(pipeline);
    return result.length > 0 ? result[0] : null;
};

export const sendMessage = asyncHandler(async (req, res, next) => {
    const receiverId = req.params.receiverId;
    const senderId = req.user._id;
    const { message, replyTo } = req.body;

    if (!senderId || !receiverId || !message) {
        return next(new errorHandler("Missing required fields.", 400));
    }

    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [senderId, receiverId],
        });
    }

    const newMessage = await Message.create({
        senderId, receiverId, conversationId: conversation._id,
        content: message, replyTo, readBy: [senderId],
    });

    conversation.messages.push(newMessage._id);
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(newMessage._id)
        .populate({
            path: 'replyTo',
            populate: { path: 'senderId', select: 'fullName username' }
        }).lean();

    if (!populatedMessage) {
        return next(new errorHandler("Failed to create message.", 500));
    }

    // --- INSTANT REAL-TIME EVENTS ---
    const receiverSocketId = getSocketId(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", populatedMessage);
    
    const senderSocketId = getSocketId(senderId);
    if (senderSocketId) io.to(senderSocketId).emit("newMessage", populatedMessage);

    // Use the reliable helper function to get the updated state for both users
    const receiverUpdate = await getUpdatedConversationForUser(conversation._id, receiverId);
    if (receiverSocketId && receiverUpdate) {
        io.to(receiverSocketId).emit("conversationUpdated", receiverUpdate);
    }

    const senderUpdate = await getUpdatedConversationForUser(conversation._id, senderId);
    if (senderSocketId && senderUpdate) {
        io.to(senderSocketId).emit("conversationUpdated", senderUpdate);
    }
    
    res.status(201).json({
        success: true,
        responseData: populatedMessage,
    });
});

export const getConversations = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    if (!userId) {
        return next(new errorHandler("User ID is required", 400));
    }
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());
    const conversations = await Conversation.aggregate([
        { $match: { participants: userObjectId } },
        {
            $lookup: {
                from: "messages", let: { conversationId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$conversationId", "$$conversationId"] } } },
                    { $sort: { createdAt: -1 } }, { $limit: 1 }
                ], as: "lastMessage"
            }
        },
        {
            $lookup: {
                from: "messages", let: { conversationId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$conversationId", "$$conversationId"] },
                                    { $not: { $in: [userObjectId, { $ifNull: ["$readBy", []] }] } }
                                ]
                            }
                        }
                    },
                    { $count: "count" }
                ], as: "unreadMessages"
            }
        },
        { $lookup: { from: "users", localField: "participants", foreignField: "_id", as: "participantsInfo" } },
        {
            $project: {
                _id: 1, updatedAt: 1, createdAt: 1,
                lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
                unreadCount: { $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0] },
                participants: {
                    $filter: {
                        input: "$participantsInfo", as: "participant",
                        cond: { $ne: ["$$participant._id", userObjectId] }
                    }
                }
            }
        },
        { $sort: { updatedAt: -1 } },
        {
            $project: {
                "participants.password": 0, "participants.email": 0, "participants.gender": 0,
                "participants.createdAt": 0, "participants.updatedAt": 0,
            }
        }
    ]);
    res.status(200).json({ success: true, responseData: conversations });
});

export const getMessages = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const otherParticipantId = req.params.otherParticipantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const conversation = await Conversation.findOne({ participants: { $all: [userId, otherParticipantId] } });
    if (!conversation) {
        return res.status(200).json({ messages: [], totalMessages: 0, hasMore: false });
    }
    const totalMessages = await Message.countDocuments({ conversationId: conversation._id });
    const messages = await Message.find({ conversationId: conversation._id })
        .populate({ path: 'replyTo', populate: { path: 'senderId', select: 'fullName username' } })
        .sort({ createdAt: -1 }).skip(skip).limit(limit);
    const formattedMessages = messages.reverse().map(msg => ({
        ...msg.toObject(),
        quotedMessage: msg.replyTo ? {
            content: msg.replyTo.content || '[No content]',
            senderName: (msg.replyTo.senderId?.fullName || 'Unknown'),
        } : null,
    }));
    res.json({ messages: formattedMessages, totalMessages, currentPage: page, hasMore: totalMessages > (page * limit) });
});

export const markMessagesRead = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const updateResult = await Message.updateMany(
        { conversationId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
    );

    if (updateResult.modifiedCount > 0) {
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            // Use the reliable helper function to get the updated state
            const updatedConversationForReader = await getUpdatedConversationForUser(conversationId, userId);
            const currentUserSocketId = getSocketId(userId.toString());
            if (currentUserSocketId && updatedConversationForReader) {
                 io.to(currentUserSocketId).emit('conversationUpdated', updatedConversationForReader);
            }
        }
    }
    res.status(200).json({ success: true, message: "Messages marked as read." });
});
