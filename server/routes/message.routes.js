import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import {sendMessage, getMessages, getConversations, markMessagesRead} from '../controllers/message.controller.js';

const router =  express.Router();

router.post('/send/:receiverId', isAuthenticated, sendMessage);
router.get('/get-messages/:otherParticipantId', isAuthenticated, getMessages);
router.get('/get-conversations', isAuthenticated, getConversations);
// Mark all messages as read in a conversation for the current user
router.post('/mark-read/:conversationId', isAuthenticated, markMessagesRead);
export default router;
