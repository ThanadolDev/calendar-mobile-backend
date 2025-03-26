const jwt = require('jsonwebtoken');
const { User } = require('../Models');
const { ApiError } = require('./error');
const { asyncHandler } = require('../utils/helpers');
const config = require('../config/config');

/**
 * Protect routes - verify JWT token
 */
exports.protect = asyncHandler(async (req, res, next) => {
  // 1) Check if token exists
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new ApiError('You are not logged in. Please log in to get access', 401)
    );
  }

  // 2) Verify token
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);

    // 3) Check if user still exists
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return next(
        new ApiError('The user belonging to this token no longer exists', 401)
      );
    }

    // 4) Check if user is active
    if (!user.isActive) {
      return next(
        new ApiError('This user account has been deactivated', 401)
      );
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError('Invalid token. Please log in again', 401));
  }
});

/**
 * Check if user belongs to a specific organization
 * @param {string} orgId - The organization ID to check against
 */
exports.restrictToOrg = (orgId) => {
  return (req, res, next) => {
    if (req.user.orgId !== orgId) {
      return next(
        new ApiError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};