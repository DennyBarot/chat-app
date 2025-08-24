import Conversation from '../models/conversationModel.js';
import { asyncHandler } from '../utilities/asyncHandlerUtility.js';

// Create a new conversation
export const createConversation = asyncHandler(async (req, res) => {
    const { participants } = req.body;
    const conversation = await getOrCreateConversation(participants);
    res.status(201).json(conversation);
});

async function getOrCreateConversation(participants) {
    let conversation = await Conversation.findOne({
        participants: { $all: participants, $size: participants.length }
    }).populate('participants', 'username fullName avatar');

    if (!conversation) {
        conversation = new Conversation({ participants });
        await conversation.save();
        conversation = await conversation.populate('participants', 'username fullName avatar');
    }
    return conversation;
}

// Get all conversations for a user
export const getConversations = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const conversations = await Conversation.find({ participants: userId })
        .populate('participants', 'username fullName avatar')
        .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
});

export const getConversationById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const conversation = await Conversation.findById(id).populate('participants', 'username fullName avatar');
    res.status(200).json(conversation);
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
