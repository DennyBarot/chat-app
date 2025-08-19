import express from 'express';
import { createConversation, getConversations, updateConversation, deleteConversation } from '../controllers/conversation.controller.js';

const router = express.Router();

// Create a new conversation
router.post('/', createConversation);

// Get all conversations for a user
router.get('/:userId', getConversations);

// Update a conversation
router.put('/:id', updateConversation);

// Delete a conversation
router.delete('/:id', deleteConversation);

export default router;
