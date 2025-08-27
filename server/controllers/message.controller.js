import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { asyncHandler } from "../utilities/asyncHandlerUtility.js";
import { errorHandler } from "../utilities/errorHandlerUtility.js";
import mongoose from 'mongoose';
import { io } from '../socket/socket.js';
import path from 'path';
import { fileURLToPath } from 'url';

// --- The Single, Reliable Helper Function ---
// This function will now be used by both sendMessage and markMessagesRead.
const getUpdatedConversationForUser = async (conversationId, userId) => {
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());
    const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(conversationId.toString()) } },
        { $lookup: { from: "messages", let: { conversationId: "$_id" }, pipeline: [ { $match: { $expr: { $eq: ["$conversationId", "$$conversationId"] } } }, { $sort: { createdAt: -1 } }, { $limit: 1 } ], as: "lastMessage" } },
        { $lookup: { from: "messages", let: { conversationId: "$_id" }, pipeline: [ { $match: { $expr: { $and: [ { $eq: ["$conversationId", "$$conversationId"] }, { $not: { $in: [userObjectId, { $ifNull: ["$readBy", []] }] } } ] } } }, { $count: "count" } ], as: "unreadMessages" } },
        { $lookup: { from: "users", localField: "participants", foreignField: "_id", as: "participantsInfo" } },
        { $project: { _id: 1, updatedAt: 1, createdAt: 1, lastMessage: { $arrayElemAt: ["$lastMessage", 0] }, unreadCount: { $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0] }, participants: { $filter: { input: "$participantsInfo", as: "participant", cond: { $ne: ["$$participant._id", userObjectId] } } } } },
        { $project: { "participants.password": 0, "participants.email": 0, "participants.gender": 0, "participants.createdAt": 0, "participants.updatedAt": 0, } }
    ];
    const result = await Conversation.aggregate(pipeline);
    return result.length > 0 ? result[0] : null;
};

export const sendMessage = asyncHandler(async (req, res, next) => {
    const receiverId = req.params.receiverId;
    const senderId = req.user._id;
    const { message, replyTo, audioData, audioDuration } = req.body;

    // Check if this is an audio message (either file upload or Base64 data)
    const isAudioMessage = (req.files && req.files.audio) || (audioData && audioData.length > 0);
    
    if (!senderId || !receiverId || (!message && !isAudioMessage)) {
        return next(new errorHandler("Missing required fields.", 400));
    }

    let conversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } });
    if (!conversation) {
        conversation = await Conversation.create({ participants: [senderId, receiverId] });
    }

    let messageData = {
        senderId,
        receiverId,
        conversationId: conversation._id,
        content: message || '[Voice Message]',
        replyTo,
        readBy: [senderId]
    };

    // Handle audio message (either file upload or Base64 data)
    if (isAudioMessage) {
        messageData.isAudioMessage = true;
        messageData.audioDuration = audioDuration || 0;
        
        if (req.files && req.files.audio) {
            // Handle file upload (for backward compatibility)
            const audioFile = req.files.audio;
            
            // Generate a unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileName = `audio-${uniqueSuffix}.${audioFile.name.split('.').pop()}`;
            
            // Store the file path
            messageData.audioUrl = `/uploads/audios/${fileName}`;
            
            // Save the file to the server
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const uploadPath = path.join(__dirname, '../uploads/audios', fileName);
            await audioFile.mv(uploadPath);
        } else if (audioData && audioData.length > 0) {
            // Handle Base64 audio data
            messageData.audioData = audioData;
        }
    }

    const newMessage = await Message.create(messageData);
    
    conversation.messages.push(newMessage._id);
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(newMessage._id).populate({ path: 'replyTo', populate: { path: 'senderId', select: 'fullName username' } }).lean();

    // --- RELIABLE REAL-TIME EVENTS USING ROOMS ---
    
    // 1. Emit the new message directly to each user's private room.
    io.to(senderId.toString()).to(receiverId.toString()).emit("newMessage", populatedMessage);

    // 2. Get and emit the updated conversation state to each user's private room.
    const senderUpdate = await getUpdatedConversationForUser(conversation._id, senderId);
    if (senderUpdate) {
        io.to(senderId.toString()).emit("conversationUpdated", senderUpdate);
    }

    const receiverUpdate = await getUpdatedConversationForUser(conversation._id, receiverId);
    if (receiverUpdate) {
        io.to(receiverId.toString()).emit("conversationUpdated", receiverUpdate);
    }
    
    res.status(201).json({ success: true, responseData: populatedMessage });
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
    
    // Get the messages that were marked as read
    const updateResult = await Message.updateMany(
        { conversationId, readBy: { $ne: userId } }, 
        { $addToSet: { readBy: userId } }
    );

    if (updateResult.modifiedCount > 0) {
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            const updatedConversationForReader = await getUpdatedConversationForUser(conversationId, userId);
            if (updatedConversationForReader) {
                // Emit conversation update to the user's private room
                io.to(userId.toString()).emit('conversationUpdated', updatedConversationForReader);
                
                // Get the other participant in the conversation
                const otherParticipant = conversation.participants.find(p => p.toString() !== userId.toString());
                if (otherParticipant) {
                    // Emit messagesRead event to the other participant to update their message read status
                    const readMessages = await Message.find({
                        conversationId,
                        readBy: userId
                    }).select('_id');
                    
                    const messageIds = readMessages.map(msg => msg._id.toString());
                    io.to(otherParticipant.toString()).emit('messagesRead', {
                        messageIds,
                        readBy: userId,
                        readAt: new Date()
                    });
                }
            }
        }
    }
    res.status(200).json({ success: true, message: "Messages marked as read." });
});
