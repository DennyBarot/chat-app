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
    const replyTo = req.body.replyTo; // <-- get replyTo from request body

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
        message,
        replyTo, // <-- pass this from frontend
    });

    const createdAt = newMessage.createdAt;

    if (newMessage) {
        conversation.messages.push(newMessage._id);
        await conversation.save();
    }
    const receiverSocketId = getSocketId(receiverId);
    const senderSocketId = getSocketId(senderId);

    
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
    }
    if (senderSocketId && senderSocketId !== receiverSocketId) {
        io.to(senderSocketId).emit("newMessage", newMessage);
    }

    console.log("sendMessage: receiverId:", receiverId);
    console.log("sendMessage: current userSocketMap keys:", Object.keys(userSocketMap));
    const socketId = getSocketId(receiverId)
    console.log("sendMessage: Emitting newMessage to socketId:", socketId);
    io.to(socketId).emit("newMessage", newMessage);

    // When sending to frontend, populate replyTo
    const populatedMessage = await Message.findById(newMessage._id).populate('replyTo');

    res.status(200).json({
        success: true,
        responseData: populatedMessage, // <-- send populated message
    });
});

export const getMessages = asyncHandler(async (req, res, next) => {
    const myId = req.user._id;
    const otherParticipantId = req.params.otherParticipantId;

    if (!myId || !otherParticipantId) {
        return next(new errorHandler("All fields are required", 400));
    }

    let conversation = await Conversation.findOne({
        participants: { $all: [myId, otherParticipantId] },
    }).populate("messages");

    if (!conversation) {
        // Return empty conversation with empty messages instead of error
        return res.status(200).json({
            success: true,
            responseData: {
                _id: null,
                participants: [myId, otherParticipantId],
                messages: [],
            },
        });
    }

    res.status(200).json({
        success: true,
        responseData: conversation,
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
        responseData: conversations,
    });
});
