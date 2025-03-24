import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import friendRoutes from './src/routes/friendRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import { authenticateToken } from './src/middleware/auth.js';
import { notFound, errorHandler } from './src/middleware/errorMiddleware.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Chat from './src/models/Chat.js';
import User from './src/models/User.js';
import { Types } from 'mongoose';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route accessed successfully', user: req.user });
});

// Connect to MongoDB
connectDB();

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Global variables for socket management
const onlineUsers = new Map();
const userActivityIntervals = new Map();
const ACTIVITY_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Socket.IO setup with detailed CORS
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Enhanced error logging middleware
io.engine.on("connection_error", (err) => {
  console.log("Connection error:", {
    code: err.code,
    message: err.message,
    context: err.context,
    req: err.req?.url,
    headers: err.req?.headers
  });
});

// Enhanced Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log('Auth attempt with token:', token ? 'Present' : 'Missing');
    console.log('Handshake auth:', socket.handshake.auth);
    
    if (!token) {
      return next(new Error('Missing token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    const user = await User.findOne({ 
      $or: [
        { firebaseUid: decoded.firebaseUid },
        { _id: socket.handshake.auth.userId }
      ]
    });

    if (!user) {
      console.log('User not found for:', {
        firebaseUid: decoded.firebaseUid,
        userId: socket.handshake.auth.userId
      });
      return next(new Error('User not found'));
    }

    socket.user = {
      id: user.firebaseUid || user._id.toString(),
      firebaseUid: user.firebaseUid,
      _id: user._id.toString(),
      displayName: user.displayName
    };

    console.log('Socket auth successful for user:', socket.user);
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error(`Authentication failed: ${error.message}`));
  }
});

io.on('connection', async (socket) => {
  try {
    const userId = socket.user.firebaseUid; // Use firebaseUid consistently
    const mongoId = socket.user._id; // Store MongoDB ID too
    
    console.log(`User connected: ${socket.id}, firebaseUid: ${userId}, mongoId: ${mongoId}`);

    // Handle user coming online
    const handleUserOnline = async () => {
      try {
        const currentUser = await User.findOne({ firebaseUid: userId });
        if (!currentUser) {
          throw new Error(`User not found with firebaseUid: ${userId}`);
        }

        onlineUsers.set(userId, {
          socketId: socket.id,
          mongoId: currentUser._id.toString()
        });

        await User.findOneAndUpdate(
          { firebaseUid: userId },
          { isOnline: true, lastSeen: new Date() }
        );
        
        const user = await User.findOne({ firebaseUid: userId })
          .populate('friends.user', 'displayName profilePicture firebaseUid');
        
        // Broadcast to all friends that user is online
        if (user) {
          user.friends.forEach(friend => {
            const friendData = onlineUsers.get(friend.user.firebaseUid);
            if (friendData) {
              io.to(friendData.socketId).emit('userOnline', {
                userId: user._id,
                firebaseUid: user.firebaseUid,
                displayName: user.displayName,
                profilePicture: user.profilePicture
              });
            }
          });
        }
        console.log(`User ${userId} is now active/online`);
      } catch (err) {
        console.error('Error in handleUserOnline:', err);
        socket.emit('error', {
          type: 'CONNECTION_ERROR',
          message: 'Failed to update online status',
          details: err.message
        });
      }
    };

    // Add activity tracking function
    const startActivityTracking = (userId) => {
      if (userActivityIntervals.has(userId)) {
        clearInterval(userActivityIntervals.get(userId));
      }
      
      const interval = setInterval(async () => {
        try {
          await User.findOneAndUpdate(
            { firebaseUid: userId },
            { lastSeen: new Date() }
          );
        } catch (err) {
          console.error('Error updating activity status:', err);
        }
      }, ACTIVITY_INTERVAL);
      
      userActivityIntervals.set(userId, interval);
    };

    // Get online users list
    socket.on('getOnlineUsers', async () => {
      try {
        const onlineUsersList = await User.find({
          firebaseUid: { $in: Array.from(onlineUsers.keys()) }
        }).select('_id firebaseUid displayName profilePicture');
        
        socket.emit('onlineUsersList', onlineUsersList);
      } catch (err) {
        console.error('Error getting online users:', err);
      }
    });

    // Handle joining chat
    socket.on('joinChat', async (data, callback) => {
      try {
        const chatId = data.chatId;
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          return callback({ error: 'Chat not found' });
        }

        await socket.join(chatId);
        
        // Send both callback and event acknowledgment
        callback({ success: true });
        socket.emit('joinChatAck', { success: true });
        
      } catch (error) {
        callback({ error: error.message });
      }
    });

    // Handle leaving chat
    socket.on('leaveChat', async (data) => {
      try {
        const chatId = typeof data === 'object' ? data.chatId : data;
        
        if (!Types.ObjectId.isValid(chatId)) {
          socket.emit('error', { message: 'Invalid chat ID format' });
          return;
        }

        socket.leave(chatId);
        console.log(`User ${socket.id} left chat ${chatId}`);

        socket.to(chatId).emit('userLeftChat', {
          chatId,
          userId: socket.user._id,
          firebaseUid: socket.user.firebaseUid
        });
      } catch (err) {
        console.error('Error leaving chat:', err);
      }
    });

    // Handle sending messages
    socket.on('sendMessage', async (messageData) => {
      try {
        const { chatId, content, messageType = 'text' } = messageData;
        console.log(`Message send attempt - User: ${userId}, Chat: ${chatId}, Type: ${messageType}`);
        
        if (!userId || !Types.ObjectId.isValid(chatId)) {
          socket.emit('error', { message: 'Invalid user session or chat ID' });
          return;
        }

        // Find current user and chat with participants
        const currentUser = await User.findOne({ firebaseUid: userId });
        const chat = await Chat.findById(chatId).populate('participants', 'firebaseUid');
        
        if (!currentUser || !chat) {
          socket.emit('error', { 
            message: !currentUser ? 'User not found' : 'Chat not found',
            details: 'Please try again'
          });
          return;
        }

        const newMessage = {
          sender: currentUser._id,
          content,
          messageType,
          readBy: [{ user: currentUser._id }],
          createdAt: new Date()
        };
        
        chat.messages.push(newMessage);
        chat.lastMessage = newMessage;
        await chat.save();
        
        const populatedChat = await Chat.findById(chatId)
          .populate('messages.sender', 'displayName profilePicture firebaseUid')
          .populate('lastMessage.sender', 'displayName profilePicture firebaseUid');
        
        const sentMessage = populatedChat.messages[populatedChat.messages.length - 1];
        
        // Send confirmation to sender
        socket.emit('messageDelivered', {
          messageId: sentMessage._id,
          chatId,
          status: 'delivered',
          timestamp: new Date()
        });
        
        // Send to specific participants only
        chat.participants.forEach(participant => {
          const participantData = onlineUsers.get(participant.firebaseUid);
          if (participantData && participantData.socketId !== socket.id) {
            io.to(participantData.socketId).emit('newMessage', {
              chatId,
              message: sentMessage
            });
            console.log(`Message sent to participant: ${participant.firebaseUid}`);
          }
        });

        console.log(`Message ${sentMessage._id} delivered to all online participants in chat ${chatId}`);
      } catch (error) {
        console.error(`Message send error - User: ${userId}:`, error);
        socket.emit('error', { 
          type: 'SERVER_ERROR',
          message: 'Failed to send message',
          details: error.message 
        });
      }
    });

    // Initialize user's online status
    await handleUserOnline();

    // Typing events removed temporarily
    socket.on('typing', ({ chatId }) => {
      // Typing functionality disabled
    });
    
    socket.on('typingStop', ({ chatId }) => {
      // Typing functionality disabled
    });

    // Handle read receipts
    socket.on('messageRead', async ({ chatId, messageId }) => {
      console.log(`Message ${messageId} marked as read by user ${userId} in chat ${chatId}`);
      try {
        const currentUser = await User.findOne({ firebaseUid: userId });
        
        await Chat.updateOne(
          { _id: chatId, 'messages._id': messageId },
          { 
            $addToSet: { 
              'messages.$.readBy': {
                user: currentUser._id,
                readAt: new Date()
              }
            }
          }
        );
        
        io.to(chatId).emit('messageRead', {
          chatId,
          messageId,
          userId: currentUser._id,
          firebaseUid: userId
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });
    
    // Add inactive/active status handlers
    socket.on('userInactive', async () => {
      try {
        console.log(`User ${userId} marked as inactive`);
        await User.findOneAndUpdate(
          { firebaseUid: userId },
          { isOnline: false, lastSeen: new Date() }
        );
        
        const user = await User.findOne({ firebaseUid: userId });
        if (user) {
          user.friends.forEach(friend => {
            const friendData = onlineUsers.get(friend.user.firebaseUid);
            if (friendData) {
              io.to(friendData.socketId).emit('userAway', {
                userId: user._id,
                firebaseUid: user.firebaseUid,
                lastSeen: new Date()
              });
            }
          });
        }
      } catch (err) {
        console.error('Error setting user as inactive:', err);
      }
    });

    socket.on('userActive', async () => {
      console.log(`User ${userId} marked as active`);
      await handleUserOnline();
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        // Remove typing timeout cleanup since events are disabled
        if (userActivityIntervals.has(userId)) {
          clearInterval(userActivityIntervals.get(userId));
          userActivityIntervals.delete(userId);
        }
        
        console.log(`User ${userId} becoming inactive/offline`);
        await User.findOneAndUpdate(
          { firebaseUid: userId },
          { isOnline: false, lastSeen: new Date() }
        );
        
        const user = await User.findOne({ firebaseUid: userId });
        if (user) {
          // Notify friends about user going offline
          user.friends.forEach(friend => {
            const friendData = onlineUsers.get(friend.user.firebaseUid);
            if (friendData) {
              io.to(friendData.socketId).emit('userOffline', {
                userId: user._id,
                firebaseUid: user.firebaseUid,
                lastSeen: new Date()
              });
            }
          });
        }
        
        onlineUsers.delete(userId);
        console.log(`User ${userId} disconnected completely`);
      } catch (err) {
        console.error(`Disconnect error for user ${userId}:`, err);
      }
    });

    // Start activity tracking when user connects
    startActivityTracking(userId);
  } catch (error) {
    console.error('Unexpected error in socket connection handler:', error);
    socket.emit('error', {
      type: 'SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: error.message
    });
  }
});