import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import mongoose from 'mongoose'; // Ensure mongoose is imported
import { getSocketId, io } from '../socket/socket.js';


// --- HELPER FUNCTION TO GET UPDATED CONVERSATION ---
// This reusable function gets a single, fully populated conversation object.
const getUpdatedConversation = async (conversationId, currentUserId) => {
    // We need to convert the string ID to a MongoDB ObjectId for the aggregation pipeline
    const userObjectId = new mongoose.Types.ObjectId(currentUserId.toString());
    
    const conversationPipeline = await Conversation.aggregate([
        // Match the specific conversation
        { $match: { _id: new mongoose.Types.ObjectId(conversationId.toString()) } },
        // Look up the latest message
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
        // Calculate unread messages for the current user
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
                                    { $not: { $in: [userObjectId, "$readBy"] } }
                                ]
                            }
                        }
                    },
                    { $count: "count" }
                ],
                as: "unreadMessages"
            }
        },
        // Look up participant details
        {
            $lookup: {
                from: "users",
                localField: "participants",
                foreignField: "_id",
                as: "participantsInfo"
            }
        },
        // Reshape the data
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
        // Clean up participant data
        {
            $project: {
                "participants.password": 0,
                "participants.email": 0,
                "participants.gender": 0,
                "participants.createdAt": 0,
                "participants.updatedAt": 0,
            }
        }
    ]);
    
    // The aggregation returns an array, so we return the first element
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
        senderId,
        receiverId,
        conversationId: conversation._id,
        content: message,
        replyTo,
        readBy: [senderId],
    });

    conversation.messages.push(newMessage._id);
    // Manually update the 'updatedAt' timestamp to ensure correct sorting
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

    // Emit the new message to both users for the main chat window
    const receiverSocketId = getSocketId(receiverId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", formattedMessage);
    }
    const senderSocketId = getSocketId(senderId);
    if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", formattedMessage);
    }

    // Emit the updated conversation object to both users for the sidebar
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

    // Convert userId to a string first, then to an ObjectId to avoid the deprecation warning.
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    const conversations = await Conversation.aggregate([
        // Stage 1: Find all conversations the user is a part of
        { $match: { participants: userObjectId } },
        // Stage 2: Look up the latest message for each conversation
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
        // Stage 3: Look up all unread messages for the current user
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
                                    { $not: { $in: [userObjectId, "$readBy"] } }
                                ]
                            }
                        }
                    },
                    { $count: "count" }
                ],
                as: "unreadMessages"
            }
        },
        // Stage 4: Look up participant details
        {
            $lookup: {
                from: "users",
                localField: "participants",
                foreignField: "_id",
                as: "participantsInfo"
            }
        },
        // Stage 5: Reshape the output
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
        // Stage 6: Sort by the most recently updated conversation
        { $sort: { updatedAt: -1 } },
        // Stage 7: Clean up the participants field to remove sensitive data
        {
            $project: {
                "participants.password": 0,
                "participants.email": 0,
                "participants.gender": 0,
                "participants.createdAt": 0,
                "participants.updatedAt": 0,
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

    // Only proceed if messages were actually updated
    if (updateResult.modifiedCount > 0) {
        const messagesThatWereRead = await Message.find({ conversationId, readBy: userId }).select('_id');
        const messageIds = messagesThatWereRead.map(msg => msg._id);

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            const otherParticipantId = conversation.participants.find(p => p.toString() !== userId.toString());
            
            // Emit to the other user that their messages were read
            if (otherParticipantId) {
                const senderSocketId = getSocketId(otherParticipantId.toString());
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messagesRead', {
                        messageIds,
                        readBy: userId,
                        readAt: new Date()
                    });
                }
            }
            
            // Emit an update to the current user's sidebar to set unreadCount to 0
            const currentUserSocketId = getSocketId(userId.toString());
            const updatedConversationForReader = await getUpdatedConversation(conversationId, userId);
            if (currentUserSocketId && updatedConversationForReader) {
                 io.to(currentUserSocketId).emit('conversationUpdated', updatedConversationForReader);
            }
        }
    }

    res.status(200).json({ success: true, message: "Messages marked as read." });
});
