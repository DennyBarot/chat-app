import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js"; // Import User model
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import mongoose from 'mongoose';
import { getSocketId, io } from '../socket/socket.js';

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
        readBy: [senderId], // The sender has implicitly read the message
    });

    // Populate the new message to get all necessary details for the events
    const populatedMessage = await Message.findById(newMessage._id)
        .populate({
            path: 'replyTo',
            populate: { path: 'senderId', select: 'fullName username' }
        })
        .lean(); // Use .lean() for a plain JS object, which is faster

    if (!populatedMessage) {
        return next(new errorHandler("Failed to create and populate message.", 500));
    }
    
    // Update the conversation's last message and timestamp
    conversation.messages.push(newMessage._id);
    conversation.updatedAt = new Date();
    await conversation.save();


    // --- INSTANT REAL-TIME EVENTS ---

    // 1. Emit the new message to the chat windows of both users
    const receiverSocketId = getSocketId(receiverId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }
    const senderSocketId = getSocketId(senderId);
    if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", populatedMessage);
    }

    // 2. Manually construct and emit the updated conversation for the sidebars
    const participants = await User.find({
        _id: { $in: conversation.participants }
    }).select("username fullName avatar").lean();

    // For the receiver
    if (receiverSocketId) {
        const unreadCountForReceiver = await Message.countDocuments({
            conversationId: conversation._id,
            readBy: { $nin: [receiverId] }
        });
        const receiverPayload = {
            _id: conversation._id,
            participants: participants.filter(p => p._id.toString() !== receiverId.toString()),
            lastMessage: populatedMessage,
            unreadCount: unreadCountForReceiver,
            updatedAt: conversation.updatedAt,
        };
        io.to(receiverSocketId).emit("conversationUpdated", receiverPayload);
    }

    // For the sender
    if (senderSocketId) {
        const senderPayload = {
            _id: conversation._id,
            participants: participants.filter(p => p._id.toString() !== senderId.toString()),
            lastMessage: populatedMessage,
            unreadCount: 0, // Sender's unread count is always 0 for their own message
            updatedAt: conversation.updatedAt,
        };
        io.to(senderSocketId).emit("conversationUpdated", senderPayload);
    }
    
    res.status(201).json({
        success: true,
        responseData: populatedMessage,
    });
});


// --- NO CHANGES NEEDED FOR THE REST OF THE FILE ---
// The aggregation pipeline is still the most efficient way for the initial load.

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
    // This function remains the same and should work correctly.
    const userId = req.user._id;
    const { conversationId } = req.params;
    const updateResult = await Message.updateMany(
        { conversationId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
    );
    if (updateResult.modifiedCount > 0) {
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            const currentUserSocketId = getSocketId(userId.toString());
            const updatedConversationForReader = await getUpdatedConversation(conversationId, userId);
            if (currentUserSocketId && updatedConversationForReader) {
                 io.to(currentUserSocketId).emit('conversationUpdated', updatedConversationForReader);
            }
        }
    }
    res.status(200).json({ success: true, message: "Messages marked as read." });
});
