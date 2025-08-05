import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import {
  sendMessage,
  getMessages,
  getConversations,
  markMessagesAsRead,
  getUnreadCount
} from '../controllers/message.controller.js';

const router = express.Router();

// Message routes
router.post('/send/:receiverId', isAuthenticated, sendMessage);
router.get('/get-messages/:otherParticipantId', isAuthenticated, getMessages);
router.get('/get-conversations', isAuthenticated, getConversations);

// Unread count and read receipt routes
router.post('/mark-read/:conversationId', isAuthenticated, markMessagesAsRead);
router.get('/unread-count/:conversationId?', isAuthenticated, getUnreadCount);

export default router;
