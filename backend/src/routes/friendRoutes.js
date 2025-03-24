import express from 'express';
import { searchUsers, addFriend, getFriends } from '../controllers/friendController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', authenticateToken, searchUsers);
router.post('/add', authenticateToken, addFriend);
router.get('/list', authenticateToken, getFriends);

export default router;