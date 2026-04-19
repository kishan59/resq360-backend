import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/auth.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded; 
      next(); 
    } catch (error) {
      console.error("Token verification failed:", error.message);
      return res.status(401).json({ 
        status: 'error', 
        message: 'Not authorized. Token failed or expired.' 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Not authorized. No token provided.' 
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Access denied. You do not have permission to perform this action.' 
      });
    }
    next();
  };
};