import Conversation from '../models/conversationModel.js';
import asyncHandler from '../utilities/asyncHandlerUtility.js';

// Create a new conversation
export const createConversation = asyncHandler(async (req, res) => {
    const { participants } = req.body;

    if (!participants || participants.length < 2) {
        return res.status(400).json({ message: 'At least two participants are required' });
    }

    const existingConversation = await Conversation.findOne({
        participants: { $all: participants }
    });

    if (existingConversation) {
        return res.status(200).json(existingConversation);
    }

    const newConversation = new Conversation({ participants });
    await newConversation.save();

    res.status(201).json(newConversation);
});

// Get all conversations for a user
export const getConversations = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const conversations = await Conversation.find({ participants: userId })
        .populate('participants', 'username email profilePic')
        .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
});

// Update a conversation (e.g., add/remove participants)
export const updateConversation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { participants } = req.body;

    const updatedConversation = await Conversation.findByIdAndUpdate(
        id,
        { participants },
        { new: true }
    ).populate('participants', 'username email profilePic');

    if (!updatedConversation) {
        return res.status(404).json({ message: 'Conversation not found' });
    }

    res.status(200).json(updatedConversation);
});

// Delete a conversation
export const deleteConversation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deletedConversation = await Conversation.findByIdAndDelete(id);

    if (!deletedConversation) {
        return res.status(404).json({ message: 'Conversation not found' });
    }

    res.status(200).json({ message: 'Conversation deleted successfully' });
});
