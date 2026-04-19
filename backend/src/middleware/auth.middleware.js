import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch full user to check status
    const user = await User.findById(decoded.id).select('_id isAdmin isFreezed');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.isFreezed) {
      return res.status(403).json({ 
        message: 'Your account has been freezed, please contact the support mail for further details.',
        isFreezed: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Alias for compatibility
export const verifyJWT = authMiddleware;
