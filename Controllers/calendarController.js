const { Calendar } = require('../Models');
const { ApiError } = require('../middleware/error');
const { asyncHandler, formatResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Create a new calendar event
 * @route POST /api/calendar/events
 */
exports.createEvent = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    isAllDay,
    recurrence,
    location,
    attendees,
    category,
    priority,
    status
  } = req.body;
  
  const { ORG_ID, EMP_ID } = req.user;
  
  if (!title || !startDate) {
    return next(new ApiError('Title and start date are required', 400));
  }
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return next(new ApiError('Invalid start date format. Use YYYY-MM-DD', 400));
  }
  
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return next(new ApiError('Invalid end date format. Use YYYY-MM-DD', 400));
  }
  
  // Validate time format if provided
  if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
    return next(new ApiError('Invalid start time format. Use HH:MM', 400));
  }
  
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
    return next(new ApiError('Invalid end time format. Use HH:MM', 400));
  }
  
  const event = await Calendar.create({
    title,
    description,
    startDate,
    endDate: endDate || startDate,
    startTime,
    endTime,
    isAllDay: Boolean(isAllDay),
    recurrence,
    location,
    attendees: Array.isArray(attendees) ? attendees : [],
    category: category || 'general',
    priority: priority || 'medium',
    status: status || 'confirmed',
    crOid: ORG_ID,
    crUid: EMP_ID
  });

  res.status(201).json(formatResponse(
    true,
    'Calendar event created successfully',
    { event }
  ));
});

/**
 * Get events by date range
 * @route GET /api/calendar/events
 */
exports.getEvents = asyncHandler(async (req, res, next) => {
  const {
    startDate,
    endDate,
    category,
    status,
    limit
  } = req.query;
  
  const { EMP_ID } = req.user;
  
  const events = await Calendar.getEventsByDateRange({
    startDate,
    endDate,
    userId: EMP_ID,
    category,
    status,
    limit: limit ? parseInt(limit) : undefined
  });

  res.status(200).json(formatResponse(
    true,
    'Events retrieved successfully',
    { events, count: events.length }
  ));
});

/**
 * Get events by month
 * @route GET /api/calendar/events/month/:year/:month
 */
exports.getEventsByMonth = asyncHandler(async (req, res, next) => {
  const { year, month } = req.params;
  const { EMP_ID } = req.user;
  
  // Validate year and month
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
    return next(new ApiError('Invalid year. Must be between 1900 and 2100', 400));
  }
  
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return next(new ApiError('Invalid month. Must be between 1 and 12', 400));
  }
  
  const events = await Calendar.getEventsByMonth(yearNum, monthNum, EMP_ID);

  res.status(200).json(formatResponse(
    true,
    'Monthly events retrieved successfully',
    { 
      events, 
      count: events.length,
      year: yearNum,
      month: monthNum
    }
  ));
});

/**
 * Get single event
 * @route GET /api/calendar/events/:id
 */
exports.getEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id))) {
    return next(new ApiError('Valid event ID is required', 400));
  }
  
  const event = await Calendar.findById(parseInt(id));
  
  if (!event) {
    return next(new ApiError(`No event found with ID: ${id}`, 404));
  }

  res.status(200).json(formatResponse(
    true,
    'Event retrieved successfully',
    { event }
  ));
});

/**
 * Update calendar event
 * @route PUT /api/calendar/events/:id
 */
exports.updateEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    title,
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    isAllDay,
    recurrence,
    location,
    attendees,
    category,
    priority,
    status
  } = req.body;
  
  const { ORG_ID, EMP_ID } = req.user;
  
  if (!id || isNaN(parseInt(id))) {
    return next(new ApiError('Valid event ID is required', 400));
  }
  
  // Validate date formats if provided
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return next(new ApiError('Invalid start date format. Use YYYY-MM-DD', 400));
  }
  
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return next(new ApiError('Invalid end date format. Use YYYY-MM-DD', 400));
  }
  
  // Validate time formats if provided
  if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
    return next(new ApiError('Invalid start time format. Use HH:MM', 400));
  }
  
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
    return next(new ApiError('Invalid end time format. Use HH:MM', 400));
  }
  
  const event = await Calendar.update(parseInt(id), {
    title,
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    isAllDay,
    recurrence,
    location,
    attendees,
    category,
    priority,
    status,
    updateOid: ORG_ID,
    updateUid: EMP_ID
  });

  if (!event) {
    return next(new ApiError(`No event found with ID: ${id}`, 404));
  }

  res.status(200).json(formatResponse(
    true,
    'Event updated successfully',
    { event }
  ));
});

/**
 * Delete calendar event
 * @route DELETE /api/calendar/events/:id
 */
exports.deleteEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { ORG_ID, EMP_ID } = req.user;
  
  if (!id || isNaN(parseInt(id))) {
    return next(new ApiError('Valid event ID is required', 400));
  }
  
  const deleted = await Calendar.delete(parseInt(id), ORG_ID, EMP_ID);
  
  if (!deleted) {
    return next(new ApiError(`No event found with ID: ${id}`, 404));
  }

  res.status(200).json(formatResponse(
    true,
    'Event deleted successfully',
    null
  ));
});

/**
 * Get user's calendar statistics
 * @route GET /api/calendar/stats
 */
exports.getStats = asyncHandler(async (req, res, next) => {
  const { year, month } = req.query;
  const { EMP_ID } = req.user;
  
  // Validate year and month if provided
  if (year && (isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > 2100)) {
    return next(new ApiError('Invalid year. Must be between 1900 and 2100', 400));
  }
  
  if (month && (isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12)) {
    return next(new ApiError('Invalid month. Must be between 1 and 12', 400));
  }
  
  const stats = await Calendar.getUserStats(EMP_ID, {
    year: year ? parseInt(year) : undefined,
    month: month ? parseInt(month) : undefined
  });

  res.status(200).json(formatResponse(
    true,
    'Calendar statistics retrieved successfully',
    { stats }
  ));
});

/**
 * Get today's events
 * @route GET /api/calendar/events/today
 */
exports.getTodayEvents = asyncHandler(async (req, res, next) => {
  const { EMP_ID } = req.user;
  const today = new Date().toISOString().split('T')[0];
  
  const events = await Calendar.getEventsByDateRange({
    startDate: today,
    endDate: today,
    userId: EMP_ID
  });

  res.status(200).json(formatResponse(
    true,
    'Today\'s events retrieved successfully',
    { 
      events, 
      count: events.length,
      date: today
    }
  ));
});

/**
 * Get upcoming events (next 7 days)
 * @route GET /api/calendar/events/upcoming
 */
exports.getUpcomingEvents = asyncHandler(async (req, res, next) => {
  const { EMP_ID } = req.user;
  const { days = 7 } = req.query;
  
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + parseInt(days));
  
  const events = await Calendar.getEventsByDateRange({
    startDate: today.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    userId: EMP_ID,
    limit: 20
  });

  res.status(200).json(formatResponse(
    true,
    'Upcoming events retrieved successfully',
    { 
      events, 
      count: events.length,
      dateRange: {
        start: today.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    }
  ));
});