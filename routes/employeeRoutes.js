const express = require('express');
const router = express.Router();

const {
  getAllEmployees,
  getEmployee,
  searchEmployees
} = require('../Controllers/employeeController');

// Employee routes
router.get('/', getAllEmployees);
router.get('/search', searchEmployees);
router.get('/:empId', getEmployee);

module.exports = router;