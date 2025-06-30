const { Employee } = require('../Models');
const { ApiError } = require('../middleware/error');
const { asyncHandler, formatResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Get all employees
 * @route GET /api/employees
 */
exports.getAllEmployees = asyncHandler(async (req, res, next) => {
  const employees = await Employee.findAll();
  
  res.status(200).json(formatResponse(
    true,
    'Employees retrieved successfully',
    { employees }
  ));
});

/**
 * Get employee by ID
 * @route GET /api/employees/:empId
 */
exports.getEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findById(req.params.empId);
  
  if (!employee) {
    return next(new ApiError(`No employee found with ID: ${req.params.empId}`, 404));
  }

  res.status(200).json(formatResponse(
    true,
    'Employee retrieved successfully',
    { employee }
  ));
});

/**
 * Search employees
 * @route GET /api/employees/search?q=searchTerm
 */
exports.searchEmployees = asyncHandler(async (req, res, next) => {
  const { q } = req.query;
  
  if (!q) {
    return next(new ApiError('Search term is required', 400));
  }
  
  const employees = await Employee.search(q);
  
  res.status(200).json(formatResponse(
    true,
    'Employee search completed successfully',
    { employees }
  ));
});