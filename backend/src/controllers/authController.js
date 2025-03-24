import User from '../models/User.js';
import admin from '../config/firebase-config.js';
import { generateToken } from '../config/jwt.js';

export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user exists in our database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    // If user doesn't exist, create new user
    if (!user) {
      const newUser = new User({
        email: decodedToken.email,
        displayName: decodedToken.name,
        firebaseUid: decodedToken.uid,
        profilePicture: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
        provider: 'google'
      });
      
      // Save user first to get MongoDB _id
      user = await newUser.save();
    }

    // Generate JWT token after ensuring user exists in database
    const jwtToken = generateToken({
      _id: user._id,         // Now we're sure this exists
      email: user.email,
      firebaseUid: user.firebaseUid,
      displayName: user.displayName,
      profilePicture: user.profilePicture
    });

    res.json({ 
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified,
        firebaseUid: user.firebaseUid  // Add this for consistency
      },
      token: jwtToken
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
