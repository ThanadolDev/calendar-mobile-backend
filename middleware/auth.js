const jwt = require('jsonwebtoken');
const { User } = require('../Models');
const { ApiError } = require('./error');
const { asyncHandler } = require('../utils/helpers');
const config = require('../config/config');
const axios = require('axios')
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
    // console.log(token)
    // Use the external verification service instead of local JWT verification
    const verificationResponse = await axios.post(
      'https://api.nitisakc.dev/auth/verify', 
      {}, // Empty body - NOT putting the token here
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    // console.log(verificationResponse)
    // Check if verification was successful
    if (verificationResponse.data && verificationResponse.data.profile) {
      // Add user information to request
      req.user = verificationResponse.data.profile[0];
      
      // Optionally add the full verification response data
      req.authData = verificationResponse.data;
      // console.log(verificationResponse.data)
      next();
    } else {
      return next(
        new ApiError('Token verification failed. Please log in again', 401)
      );
    }
  } catch (error) {
    // Handle different error scenarios
    // console.log(error.response)
    if (error.response) {
      // The verification service responded with an error status
      const statusCode = error.response.status || 401;
      const message = error.response.data?.message || 'Token verification failed. Please log in again';
      return next(new ApiError(message, statusCode));
    } else if (error.request) {
      // The request was made but no response was received
      return next(new ApiError('Verification service not available. Please try again later', 503));
    } else {
      // Something else went wrong
      return next(new ApiError('Invalid token. Please log in again', 401));
    }
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