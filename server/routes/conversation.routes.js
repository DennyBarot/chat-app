import express from 'express';
import { createConversation, getConversations, getConversationById, updateConversation, deleteConversation } from '../controllers/conversation.controller.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a new conversation
router.post('/', isAuthenticated, createConversation);

// Get all conversations for a user
router.get('/:userId', isAuthenticated, getConversations);

// Get conversation by id
router.get('/id/:id', isAuthenticated, getConversationById);

// Update a conversation
router.put('/:id', isAuthenticated, updateConversation);

// Delete a conversation
router.delete('/:id', isAuthenticated, deleteConversation);

export default router;
