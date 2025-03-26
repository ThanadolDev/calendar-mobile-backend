const jwt = require('jsonwebtoken');
const { User } = require('../Models');
const { ApiError } = require('../middleware/error');
const { asyncHandler } = require('../utils/helpers');
const config = require('../config/config');

/**
 * Generate JWT token
 * @param {string} id - User ID to encode in the token
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn
  });
};

/**
 * Login user and return JWT token
 * @route POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { userId, password, orgId } = req.body;

  // 1) Check if email and password exist
  if (!userId || !password) {
    return next(new ApiError('Please provide user ID and password', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findByUserAndCompany(userId, orgId || null);

  if (!user || !(await user.comparePassword(password))) {
    return next(new ApiError('Incorrect user ID or password', 401));
  }

  // 3) Check if user is active
  if (!user.isActive) {
    return next(new ApiError('Your account has been deactivated', 401));
  }

  // 4) If everything is ok, send token to client
  const token = generateToken(user.userId);

  // Remove password from output
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
});

/**
 * Get current logged in user
 * @route GET /api/auth/me
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  // User is already available in req due to the protect middleware
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

/**
 * Check the current version of the application
 * @route GET /api/auth/version
 */
exports.getVersion = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      version: config.app.version,
      name: config.app.name,
      env: config.app.env
    }
  });
});