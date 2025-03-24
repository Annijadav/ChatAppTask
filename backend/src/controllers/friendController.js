import mongoose from 'mongoose';
import User from '../models/User.js';
import Chat from '../models/Chat.js';  // Add this import

// Search users by email
export const searchUsers = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email || email.length < 3) {
      return res.status(400).json({ 
        message: 'Please provide at least 3 characters for search' 
      });
    }

    // Find current user by firebaseUid
    const currentUser = await User.findOne({ firebaseUid: req.user.id });
    
    if (!currentUser) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Get array of friend user IDs from the friends array
    const friendUserIds = currentUser.friends.map(friend => friend.user);

    const users = await User.find({
      $and: [
        { email: { $regex: `^${email}`, $options: 'i' } },
        { firebaseUid: { $ne: req.user.id } },
        { _id: { $nin: friendUserIds } }
      ]
    })
    .populate({
      path: 'friends',
      populate: {
        path: 'chat',
        select: '_id'
      }
    })
    .select('email displayName profilePicture firebaseUid')
    .limit(10);
    
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add friend
export const addFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    const currentUserId = req.user.id;

    // Start a MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find both users with proper error handling
      const [currentUser, friendUser] = await Promise.all([
        User.findOne({ firebaseUid: currentUserId }).session(session),
        User.findOne({ firebaseUid: friendId }).session(session)
      ]);

      if (!currentUser) {
        throw new Error('Current user not found');
      }

      if (!friendUser) {
        throw new Error('Friend user not found');
      }

      // Check if already friends
      const alreadyFriends = currentUser.friends.some(
        f => f.user.toString() === friendUser._id.toString()
      );

      if (alreadyFriends) {
        throw new Error('Already friends');
      }

      // Create a new chat
      const newChat = new Chat({
        participants: [currentUser._id, friendUser._id],
        chatType: 'direct',
        messages: []
      });

      // Save chat and update both users
      await newChat.save({ session });

      // Add friend relationships with chat reference
      currentUser.friends.push({
        user: friendUser._id,
        chat: newChat._id
      });

      friendUser.friends.push({
        user: currentUser._id,
        chat: newChat._id
      });

      // Save both users
      await Promise.all([
        currentUser.save({ session }),
        friendUser.save({ session })
      ]);

      // Commit the transaction
      await session.commitTransaction();

      // Return populated response
      const populatedFriend = await User.findById(currentUser._id)
        .populate('friends.user', 'displayName profilePicture email')
        .populate('friends.chat');

      res.json({
        message: 'Friend added successfully',
        friend: populatedFriend.friends[populatedFriend.friends.length - 1]
      });

    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }

  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to add friend'
    });
  }
};

// Get friends list
export const getFriends = async (req, res) => {
  try {
    const currentUser = await User.findOne({ firebaseUid: req.user.id })
      .populate({
        path: 'friends.user',
        select: 'displayName profilePicture email isOnline lastSeen'
      })
      .populate({
        path: 'friends.chat',
        select: 'lastMessage updatedAt'
      });

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(currentUser.friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: error.message });
  }
};