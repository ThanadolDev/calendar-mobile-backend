
const express = require('express');

const {
  createEvent,
  getEvents,
  getEventsByMonth,
  getEvent,
  updateEvent,
  deleteEvent,
  getStats,
  getTodayEvents,
  getUpcomingEvents,
  getHolidays,
  getLeaveEvents,
  getUnifiedCalendar,
  getLeaveBalance,
  getMonthCalendarWithHolidays
} = require('../Controllers/calendarController');

// const auth = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
// router.use(auth);

// Event CRUD operations
router.post('/events', createEvent);
router.get('/events', getEvents);
router.get('/events/today', getTodayEvents);
router.get('/events/upcoming', getUpcomingEvents);
router.get('/events/month/:year/:month', getEventsByMonth);
router.get('/events/:id', getEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

// Statistics
router.get('/stats', getStats);

router.get('/holidays', getHolidays);
router.get('/leaves', getLeaveEvents);
router.get('/unified', getUnifiedCalendar);
router.get('/leave-balance/:employeeId', getLeaveBalance);
router.get('/month/:year/:month', getMonthCalendarWithHolidays);

module.exports = router;