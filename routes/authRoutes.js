const express = require('express');
const { authController } = require('../Controllers');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', authController.login);
router.get('/version', authController.getVersion);

// Protected routes
router.get('/me', protect, authController.getMe);

module.exports = router;