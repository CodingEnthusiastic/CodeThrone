import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  console.log('🔐 Auth middleware triggered');
  console.log('📊 Request headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: 'Access token required' });
    }

    console.log('🔍 Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded, user ID:', decoded.userId);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found for token');
      return res.status(401).json({ message: 'Invalid token' });
    }

    console.log('✅ User authenticated:', user.username, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  console.log('🛡️ Admin check for user:', req.user?.username, 'Role:', req.user?.role);
  if (req.user.role !== 'admin') {
    console.log('❌ Admin access denied for user:', req.user?.username);
    return res.status(403).json({ message: 'Admin access required' });
  }
  console.log('✅ Admin access granted');
  next();
};