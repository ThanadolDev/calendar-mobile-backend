const express = require('express');
const { diecutController, diecutStatusController } = require('../Controllers');
const { protect } = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

// Configure multer for in-memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Protect all routes
// router.use(protect);

// Routes
router.route('/')
  .get(diecutController.getAllDiecuts)
  .post(upload.single('image'), diecutController.createDiecut);

// router.route('/:id')
//   .get(diecutController.getDiecut)
//   .put(upload.single('image'), diecutController.updateDiecut)
//   .delete(diecutController.deleteDiecut);

router.post('/:id/serial', diecutController.generateSerialNumber);

router.get('/status', diecutController.getDiecutStatusReport);

// Get diecut status summary
router.get('/status/summary', diecutController.getDiecutStatusSummary);

module.exports = router;