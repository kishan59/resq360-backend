import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  let token;

  // Check if the request has an Authorization header that starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token (Format: "Bearer <token_string>")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using our secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_fallback_key');

      // Attach the decoded payload (which has { id, role }) to the request object
      req.user = decoded; 

      // The Bouncer steps aside and lets the request pass to the controller
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


// The Role-Based Bouncer
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user was attached by the 'protect' middleware right before this runs
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Access denied. You do not have permission to perform this action.' 
      });
    }
    // If they have the right role, let them through
    next();
  };
};