import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import mongoose from 'mongoose'; // Ensure mongoose is imported
import { getSocketId, io } from '../socket/socket.js';


// --- HELPER FUNCTION TO GET UPDATED CONVERSATION ---
const getUpdatedConversation = async (conversationId, currentUserId) => {
    const userObjectId = new mongoose.Types.ObjectId(currentUserId.toString());
    
    const conversationPipeline = await Conversation.aggregate([
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
                _id: 1,
                updatedAt: 1,
                createdAt: 1,
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
    ]);
    
    return conversationPipeline.length > 0 ? conversationPipeline[0] : null;
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
        });
        
    const formattedMessage = {
        ...populatedMessage.toObject(),
        quotedMessage: populatedMessage.replyTo ? {
            content: populatedMessage.replyTo.content || '[No content]',
            senderName: (populatedMessage.replyTo.senderId?.fullName || 'Unknown'),
        } : null,
    };

    const receiverSocketId = getSocketId(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", formattedMessage);
    
    const senderSocketId = getSocketId(senderId);
    if (senderSocketId) io.to(senderSocketId).emit("newMessage", formattedMessage);

    const senderConversationUpdate = await getUpdatedConversation(conversation._id, senderId);
    const receiverConversationUpdate = await getUpdatedConversation(conversation._id, receiverId);

    if (senderSocketId && senderConversationUpdate) {
        io.to(senderSocketId).emit("conversationUpdated", senderConversationUpdate);
    }
    if (receiverSocketId && receiverConversationUpdate) {
        io.to(receiverSocketId).emit("conversationUpdated", receiverConversationUpdate);
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
                                    // --- THIS IS THE FIX ---
                                    // Use $ifNull to provide a default empty array if `readBy` is missing
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
        { $sort: { updatedAt: -1 } },
        {
            $project: {
                "participants.password": 0, "participants.email": 0, "participants.gender": 0,
                "participants.createdAt": 0, "participants.updatedAt": 0,
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({
        participants: { $all: [userId, otherParticipantId] },
    });

    if (!conversation) {
        return res.status(200).json({ messages: [], totalMessages: 0, hasMore: false });
    }

    const totalMessages = await Message.countDocuments({ conversationId: conversation._id });

    const messages = await Message.find({ conversationId: conversation._id })
        .populate({
            path: 'replyTo',
            populate: { path: 'senderId', select: 'fullName username' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const formattedMessages = messages.reverse().map(msg => ({
        ...msg.toObject(),
        quotedMessage: msg.replyTo ? {
            content: msg.replyTo.content || '[No content]',
            senderName: (msg.replyTo.senderId?.fullName || 'Unknown'),
        } : null,
    }));

    res.json({
        messages: formattedMessages,
        totalMessages,
        currentPage: page,
        hasMore: totalMessages > (page * limit),
    });
});

export const markMessagesRead = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const updateResult = await Message.updateMany(
        { conversationId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
    );

    if (updateResult.modifiedCount > 0) {
        const messagesThatWereRead = await Message.find({ conversationId, readBy: userId }).select('_id');
        const messageIds = messagesThatWereRead.map(msg => msg._id);

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            const otherParticipantId = conversation.participants.find(p => p.toString() !== userId.toString());
            
            if (otherParticipantId) {
                const senderSocketId = getSocketId(otherParticipantId.toString());
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messagesRead', {
                        messageIds, readBy: userId, readAt: new Date()
                    });
                }
            }
            
            const currentUserSocketId = getSocketId(userId.toString());
            const updatedConversationForReader = await getUpdatedConversation(conversationId, userId);
            if (currentUserSocketId && updatedConversationForReader) {
                 io.to(currentUserSocketId).emit('conversationUpdated', updatedConversationForReader);
            }
        }
    }

    res.status(200).json({ success: true, message: "Messages marked as read." });
});
