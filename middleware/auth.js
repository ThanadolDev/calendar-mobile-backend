const jwt = require('jsonwebtoken');
const { User } = require('../Models');
const { ApiError } = require('./error');
const { asyncHandler } = require('../utils/helpers');
const config = require('../config/config');

/**
 * Protect routes - verify JWT token
 */
exports.protect = asyncHandler(async (req, res, next) => {
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

  try {
   

    
    if (!user) {
      return next(
        new ApiError('The user belonging to this token no longer exists', 401)
      );
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError('Invalid token. Please log in again', 401));
  }
});

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