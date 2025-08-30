import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Placeholder for future call-related API endpoints
// Currently, all call functionality is handled via WebSocket/socket.io

router.get('/test', isAuthenticated, (req, res) => {
  res.json({ message: 'Call routes are working' });
});

export default router;
