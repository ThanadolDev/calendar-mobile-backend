const express = require('express');
const { toolingController } = require('../Controllers');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
// router.use(protect);

// Routes
router.route('/')
  .get(toolingController.getAllToolings)
  .post(toolingController.createTooling);

router.route('/:id')
  .get(toolingController.getTooling)
  .put(toolingController.updateTooling)
  .delete(toolingController.deleteTooling);

router.get('/materials/:prodId/:revision', toolingController.getMaterialsByProductAndRevision);

module.exports = router;