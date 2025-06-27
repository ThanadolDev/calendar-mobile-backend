const express = require('express');
const authRoutes = require('./authRoutes');
const diecutRoutes = require('./diecutRoutes');
const toolingRoutes = require('./toolingRoutes');
const expressionsRoutes = require('./expressionRoute');
const router = express.Router();

// Base routes
router.use('/auth', authRoutes);
router.use('/diecuts', diecutRoutes);
router.use('/toolings', toolingRoutes);
router.use('/expressions', expressionsRoutes);

module.exports = router;