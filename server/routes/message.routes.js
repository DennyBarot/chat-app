import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import {sendMessage,getMessages, getConversations} from '../controllers/message.controller.js';
import { markConversationRead } from '../controllers/message.controller.js';
const router =  express.Router();

router.post('/send/:receiverId', isAuthenticated, sendMessage);
router.get('/get-messages/:otherParticipantId', isAuthenticated, getMessages);
router.get('/get-conversations', isAuthenticated, getConversations);
// server/routes/message.routes.js
router.post('/mark-read/:conversationId', isAuthenticated, markConversationRead);

export default router;
