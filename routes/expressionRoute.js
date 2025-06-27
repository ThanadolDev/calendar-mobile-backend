const express = require('express');
const { expressionController } = require('../Controllers');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(expressionController.getAllExpressions)
  .post(expressionController.createExpression); // No multer needed

router.route('/:id')
  .get(expressionController.getExpression)
  .put(expressionController.updateExpression)
  .delete(expressionController.deleteExpression);

router.get('/received/:empId', expressionController.getReceivedExpressions);
router.get('/sent/:empId', expressionController.getSentExpressions);

module.exports = router;