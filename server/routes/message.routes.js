import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import {sendMessage,getMessages, getConversations} from '../controllers/message.controller.js';

const router =  express.Router();

router.post('/send/:receiverId', isAuthenticated, sendMessage);
router.get('/get-messages/:conversationId', isAuthenticated, getMessages);
router.get('/get-conversations', isAuthenticated, getConversations);

export default router;
