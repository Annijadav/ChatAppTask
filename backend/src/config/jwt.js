import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  // Create payload with required fields, handling cases where _id might not exist
  const payload = {
    id: user._id,  // Use firebaseUid as primary id
    email: user.email,
    firebaseUid: user.firebaseUid,
    profilePicture: user.profilePicture || '',
    displayName: user.displayName || ''
  };

  // Add mongoId only if it exists
  if (user._id) {
    payload.mongoId = user._id.toString();
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};