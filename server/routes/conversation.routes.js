import express from 'express';
import { createConversation, getConversations, getConversationById, updateConversation, deleteConversation } from '../controllers/conversation.controller.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a new conversation
router.post('/', authMiddleware, createConversation);

// Get all conversations for a user
router.get('/:userId', authMiddleware, getConversations);

// Get conversation by id
router.get('/id/:id', authMiddleware, getConversationById);

// Update a conversation
router.put('/:id', authMiddleware, updateConversation);

// Delete a conversation
router.delete('/:id', authMiddleware, deleteConversation);

export default router;
