import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true  // Add index for email field
  },
  displayName: String,
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  profilePicture: String,
  emailVerified: Boolean,
  provider: String,
  friends: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  }
});

// Add compound index for email and firebaseUid
userSchema.index({ email: 1, firebaseUid: 1 });

export default mongoose.model('User', userSchema);