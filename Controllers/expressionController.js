const { Expression } = require('../Models');
const { ApiError } = require('../middleware/error');
const { asyncHandler, formatResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Create a new expression
 * @route POST /api/expressions
 */
exports.createExpression = asyncHandler(async (req, res, next) => {
  const { type, recipient, content, privacy, status, attachments } = req.body;
  const { ORG_ID, EMP_ID } = req.user;
  
  if (!recipient || !content) {
    return next(new ApiError('Recipient and content are required', 400));
  }
  
  // Map frontend values to DB values
  const expType = type === 'praise' ? 'G' : 'B';
  const expKind = privacy === 'public' ? 'X' : 'H';
  const expStatus = status === 'published' ? 'T' : 'F';
  
  const result = await Expression.create({
    expType,
    expKind,
    expTo: recipient,
    expSubject: content.substring(0, 100),
    expDetail: content,
    status: expStatus,
    crOid: ORG_ID,
    crUid: EMP_ID,
    attachments: attachments || []
  });

  res.status(201).json(formatResponse(
    true,
    'Expression created successfully',
    { expression: result }
  ));
});

/**
 * Get all expressions
 * @route GET /api/expressions
 */
exports.getAllExpressions = asyncHandler(async (req, res, next) => {
  const expressions = await Expression.findAll();
  
  res.status(200).json(formatResponse(
    true,
    'Expressions retrieved successfully',
    { expressions }
  ));
});

/**
 * Get single expression
 * @route GET /api/expressions/:id
 */
exports.getExpression = asyncHandler(async (req, res, next) => {
  const expression = await Expression.findById(req.params.id);
  
  if (!expression) {
    return next(new ApiError(`No expression found with ID: ${req.params.id}`, 404));
  }

  res.status(200).json(formatResponse(
    true,
    'Expression retrieved successfully',
    { expression }
  ));
});

/**
 * Update expression
 * @route PUT /api/expressions/:id
 */
exports.updateExpression = asyncHandler(async (req, res, next) => {
  const { type, content, privacy, status, attachments } = req.body;
  const { ORG_ID, EMP_ID } = req.user;
  
  const expType = type === 'praise' ? 'G' : 'B';
  const expKind = privacy === 'public' ? 'X' : 'H';
  const expStatus = status === 'published' ? 'T' : 'F';
  
  const expression = await Expression.update(req.params.id, {
    expType,
    expKind,
    expSubject: content.substring(0, 100),
    expDetail: content,
    status: expStatus,
    updateOid: ORG_ID,
    updateUid: EMP_ID,
    attachments: attachments || []
  });

  if (!expression) {
    return next(new ApiError(`No expression found with ID: ${req.params.id}`, 404));
  }

  res.status(200).json(formatResponse(
    true,
    'Expression updated successfully',
    { expression }
  ));
});

/**
 * Delete expression
 * @route DELETE /api/expressions/:id
 */
exports.deleteExpression = asyncHandler(async (req, res, next) => {
  const { ORG_ID, EMP_ID } = req.user;
  
  const deleted = await Expression.delete(req.params.id, ORG_ID, EMP_ID);
  
  if (!deleted) {
    return next(new ApiError(`No expression found with ID: ${req.params.id}`, 404));
  }

  res.status(200).json(formatResponse(
    true,
    'Expression deleted successfully',
    null
  ));
});

/**
 * Get received expressions for a user
 * @route GET /api/expressions/received/:empId
 */
exports.getReceivedExpressions = asyncHandler(async (req, res, next) => {
  const { empId } = req.params;
  const { timePeriod, year, month } = req.query;
  
  const expressions = await Expression.getReceivedExpressions(empId, { timePeriod, year, month });
  
  res.status(200).json(formatResponse(
    true,
    'Received expressions retrieved successfully',
    { expressions }
  ));
});

/**
 * Get sent expressions for a user
 * @route GET /api/expressions/sent/:empId
 */
exports.getSentExpressions = asyncHandler(async (req, res, next) => {
  const { empId } = req.params;
  const { timePeriod, year, month } = req.query;
  
  const expressions = await Expression.getSentExpressions(empId, { timePeriod, year, month });
  
  res.status(200).json(formatResponse(
    true,
    'Sent expressions retrieved successfully',
    { expressions }
  ));
});