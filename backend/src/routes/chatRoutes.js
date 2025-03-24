import express from 'express';
import { 
  getChatWithUser, 
  postMessage, 
  deleteMessage,
  getUserChats // Add this new import
} from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add new route at the top
router.get('/my-chats', authenticateToken, getUserChats);

router.get('/user/:userId', authenticateToken, getChatWithUser);
router.post('/:chatId/message', authenticateToken, postMessage);
router.delete('/:chatId/message/:messageId', authenticateToken, deleteMessage);

export default router;