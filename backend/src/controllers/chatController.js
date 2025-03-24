import Chat from '../models/Chat.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Get chat with a specific user
export const getChatWithUser = async (req, res) => {
  try {
    const { userId: friendId } = req.params; // Friend's MongoDB _id
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Convert friendId to ObjectId
    const friendObjectId = new mongoose.Types.ObjectId(friendId);
    const currentUser = await User.findOne({ firebaseUid: req.user.id });

    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Find or create chat between users using ObjectIds
    let chat = await Chat.findOne({
      chatType: 'direct',
      participants: {
        $all: [currentUser._id, friendObjectId],
        $size: 2
      }
    })
    .populate('messages.sender', 'displayName profilePicture firebaseUid')
    .populate('participants', 'displayName profilePicture isOnline lastSeen')
    .sort({ 'messages.createdAt': 1 }); // Sort messages by time

    if (!chat) {
      chat = new Chat({
        participants: [currentUser._id, friendObjectId],
        chatType: 'direct',
        messages: []
      });
      await chat.save();
    }

    // Format chat for frontend
    const formattedChat = {
      chatId: chat._id,
      participants: chat.participants.map(p => ({
        userId: p._id,
        displayName: p.displayName,
        profilePicture: p.profilePicture,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen
      })),
      messages: chat.messages.map(msg => ({
        messageId: msg._id,
        content: msg.content,
        messageType: msg.messageType,
        sender: {
          userId: msg.sender._id,
          displayName: msg.sender.displayName,
          profilePicture: msg.sender.profilePicture
        },
        createdAt: msg.createdAt,
        readBy: msg.readBy
      }))
    };

    res.json(formattedChat);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Post a new message
export const postMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text' } = req.body;
    
    // Find the chat first
    const chat = await Chat.findById(chatId)
      .populate('participants', 'displayName profilePicture');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Get current user from JWT token
    const currentUser = await User.findOne({ firebaseUid: req.user.id });
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Simple check if user is a participant
    if (!chat.participants.find(p => p._id.toString() === currentUser._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to post in this chat' });
    }

    // Create and add new message
    const newMessage = {
      sender: currentUser._id,
      content,
      messageType,
      readBy: [{ user: currentUser._id }]
    };

    chat.messages.push(newMessage);
    chat.lastMessage = newMessage;
    await chat.save();

    // Return populated chat data
    const populatedChat = await Chat.findById(chatId)
      .populate('messages.sender', 'displayName profilePicture')
      .populate('lastMessage.sender', 'displayName profilePicture')
      .populate('participants', 'displayName profilePicture isOnline');

    res.json(populatedChat);
  } catch (error) {
    console.error('Post message error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify message sender
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Chat.updateOne(
      { _id: chatId },
      { 
        $pull: { messages: { _id: messageId } },
        $set: { 
          lastMessage: chat.messages[chat.messages.length - 2] || null 
        }
      }
    );

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all chats for current user
export const getUserChats = async (req, res) => {
  try {
    const currentUserId = req.user.id; // This is firebaseUid from JWT
    
    // Find the MongoDB user first
    const currentUser = await User.findOne({ firebaseUid: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all chats where user is a participant
    const chats = await Chat.find({
      participants: currentUser._id
    })
    .populate({
      path: 'participants',
      select: 'displayName profilePicture firebaseUid isOnline lastSeen'
    })
    .populate({
      path: 'messages.sender',
      select: 'displayName profilePicture firebaseUid'
    })
    .populate({
      path: 'lastMessage.sender',
      select: 'displayName profilePicture firebaseUid'
    })
    .sort({ 'messages.createdAt': -1 }); // Sort by latest message

    // Format chats for frontend
    const formattedChats = chats.map(chat => ({
      chatId: chat._id,
      participants: chat.participants.map(p => ({
        userId: p._id,
        firebaseUid: p.firebaseUid,
        displayName: p.displayName,
        profilePicture: p.profilePicture,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen
      })),
      messages: chat.messages.map(msg => ({
        messageId: msg._id,
        content: msg.content,
        messageType: msg.messageType,
        sender: {
          userId: msg.sender._id,
          firebaseUid: msg.sender.firebaseUid,
          displayName: msg.sender.displayName,
          profilePicture: msg.sender.profilePicture
        },
        createdAt: msg.createdAt,
        readBy: msg.readBy
      })),
      lastMessage: chat.lastMessage ? {
        content: chat.lastMessage.content,
        sender: {
          userId: chat.lastMessage.sender._id,
          firebaseUid: chat.lastMessage.sender.firebaseUid,
          displayName: chat.lastMessage.sender.displayName
        },
        createdAt: chat.lastMessage.createdAt
      } : null
    }));

    res.json({
      chats: formattedChats,
      userId: currentUser._id,
      firebaseUid: currentUser.firebaseUid
    });

  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ error: error.message });
  }
};