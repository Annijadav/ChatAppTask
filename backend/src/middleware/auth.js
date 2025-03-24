import jwt from 'jsonwebtoken';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader);

    const token = authHeader?.split(' ')[1];
    console.log('Token Length:', token?.length);
    console.log('JWT_SECRET Length:', process.env.JWT_SECRET?.length);

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      // Attempt to decode without verification first (for debugging)
      const decodedWithoutVerify = jwt.decode(token);
    //   console.log('Decoded without verify:', decodedWithoutVerify);
      
      // Now verify with secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //   console.log('Successfully verified token:', decoded);
      
      req.user = {
        id: decoded.firebaseUid,
        email: decoded.email,
        displayName: decoded.displayName
      };

      next();
    } catch (verifyError) {
    //   console.error('Token verification specific error:', {
    //     name: verifyError.name,
    //     message: verifyError.message,
    //     expiredAt: verifyError.expiredAt
    //   });
      throw verifyError;
    }
  } catch (error) {
    // console.error('Authentication error:', {
    //   name: error.name,
    //   message: error.message,
    //   expiredAt: error.expiredAt
    // });
    return res.status(401).json({ 
      message: 'Invalid token',
      details: error.message
    });
  }
};
