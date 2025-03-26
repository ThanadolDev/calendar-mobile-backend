const express = require('express');
const authRoutes = require('./authRoutes');
const diecutRoutes = require('./diecutRoutes');
const toolingRoutes = require('./toolingRoutes');

const router = express.Router();

// Base routes
router.use('/auth', authRoutes);
router.use('/diecuts', diecutRoutes);
router.use('/toolings', toolingRoutes);

module.exports = router;