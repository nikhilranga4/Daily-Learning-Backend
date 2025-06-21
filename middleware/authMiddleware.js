// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) return res.status(404).json({ msg: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (
    req.user &&
    (req.user.email === 'nikhilnga43@mail.com' || req.user.isAdmin)
  ) {
    next();
  } else {
    return res.status(403).json({ msg: 'Access denied: Admins only' });
  }
};

// ✅ Add this to fix your error
exports.isApprovedUser = (req, res, next) => {
  if (req.user && req.user.approval_status === 'approved') {
    next();
  } else {
    return res.status(403).json({ msg: 'Access denied: Awaiting admin approval' });
  }
};
