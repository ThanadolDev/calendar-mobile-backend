const { Calendar } = require('../Models');
const { ApiError } = require('../middleware/error');
const { asyncHandler, formatResponse } = require('../utils/helpers');
const { executeSqlById } = require('../utils/sqlUtil');
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

// ============================================================================
// HOLIDAY & NON-WORK DAY API ENDPOINTS
// ============================================================================

/**
 * Get non-work days and holidays for calendar display
 * @route GET /api/calendar/holidays
 */
exports.getHolidays = asyncHandler(async (req, res, next) => {
  const { year, startDate, endDate } = req.query;
  
  // Validate required parameters
  if (!year) {
    return next(new ApiError('Year parameter is required', 400));
  }

  // Validate year format
  const yearNum = parseInt(year);
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
    return next(new ApiError('Invalid year. Must be between 1900 and 2100', 400));
  }

  // Set default date range if not provided
  const start = startDate || `01/01/${year}`;
  const end = endDate || `31/12/${year}`;

  // Validate date formats if provided
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (startDate && !dateRegex.test(startDate)) {
    return next(new ApiError('Invalid startDate format. Use DD/MM/YYYY', 400));
  }
  if (endDate && !dateRegex.test(endDate)) {
    return next(new ApiError('Invalid endDate format. Use DD/MM/YYYY', 400));
  }

  try {
    // Execute SQL query for holidays/non-work days (SQL_NO: 700860001)
    // Note: Current SQL only uses :as_yyyy parameter, ignoring date range
    // TODO: Update database SQL to include date range filtering
    const holidays = await executeSqlById(700860001, {
      as_yyyy: yearNum
    });

    // Client-side date filtering since SQL doesn't support it yet
    let filteredHolidays = holidays;
    if (startDate || endDate) {
      const startDateObj = startDate ? new Date(startDate.split('/').reverse().join('-')) : new Date('1900-01-01');
      const endDateObj = endDate ? new Date(endDate.split('/').reverse().join('-')) : new Date('2100-12-31');
      
      filteredHolidays = holidays.filter(holiday => {
        if (!holiday.NON_WORK_DATE) return false;
        
        // Parse NON_WORK_DATE (format: dd/mm/yyyy hh24:mi)
        const datePart = holiday.NON_WORK_DATE.split(' ')[0];
        const holidayDate = new Date(datePart.split('/').reverse().join('-'));
        
        return holidayDate >= startDateObj && holidayDate <= endDateObj;
      });
    }

    // Transform data for frontend consumption
    const transformedHolidays = filteredHolidays.map(holiday => {
      // Parse date from NON_WORK_DATE (format: dd/mm/yyyy hh24:mi)
      const datePart = holiday.NON_WORK_DATE ? holiday.NON_WORK_DATE.split(' ')[0] : '';
      
      return {
        id: `holiday_${datePart.replace(/\//g, '')}`,
        date: datePart,
        title: holiday.NON_WORK_DESC || 'Holiday',
        type: 'holiday',
        category: 'holiday',
        isRecurring: false,
        dayName: datePart ? new Date(datePart.split('/').reverse().join('-')).toLocaleDateString('en', { weekday: 'long' }) : '',
        isAllDay: true,
        color: getHolidayColor('HOLIDAY')
      };
    });

    logger.info(`Retrieved ${transformedHolidays.length} holidays for year ${yearNum}`);

    res.status(200).json(formatResponse(
      true,
      'Holidays retrieved successfully',
      {
        holidays: transformedHolidays,
        year: yearNum,
        dateRange: { start, end },
        count: transformedHolidays.length,
        note: 'Date range filtering applied client-side. Consider updating SQL for better performance.'
      }
    ));
  } catch (error) {
    logger.error('Error retrieving holidays:', error);
    return next(new ApiError('Failed to retrieve holidays', 500));
  }
});

/**
 * Get employee leave events for calendar display
 * @route GET /api/calendar/leaves
 */
exports.getLeaveEvents = asyncHandler(async (req, res, next) => {
  const { year, startDate, endDate, employeeId } = req.query;
  
  if (!year) {
    return next(new ApiError('Year parameter is required', 400));
  }

  // Validate year format
  const yearNum = parseInt(year);
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
    return next(new ApiError('Invalid year. Must be between 1900 and 2100', 400));
  }

  const start = startDate || `01/01/${year}`;
  const end = endDate || `31/12/${year}`;

  // Validate date formats if provided
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (startDate && !dateRegex.test(startDate)) {
    return next(new ApiError('Invalid startDate format. Use DD/MM/YYYY', 400));
  }
  if (endDate && !dateRegex.test(endDate)) {
    return next(new ApiError('Invalid endDate format. Use DD/MM/YYYY', 400));
  }

  try {
    // The current SQL only uses :as_yyyy and :as_ddmmyyyy parameters
    // We need to provide the end date in the format the SQL expects
    const leaves = await executeSqlById(700860002, {
      as_yyyy: year.toString(),
      as_ddmmyyyy: end // Use end date as the filter date
    });

    // Client-side filtering for employee and date range since SQL doesn't support them
    let filteredLeaves = leaves;

    // Filter by employee ID if provided
    if (employeeId) {
      filteredLeaves = filteredLeaves.filter(leave => 
        leave.EMP_ID && leave.EMP_ID.toString().includes(employeeId.toString())
      );
    }

    // Filter by date range if provided
    if (startDate) {
      const startDateObj = new Date(startDate.split('/').reverse().join('-'));
      filteredLeaves = filteredLeaves.filter(leave => {
        if (!leave.START_DATE) return false;
        const leaveStartDate = new Date(leave.START_DATE);
        return leaveStartDate >= startDateObj;
      });
    }

    if (endDate) {
      const endDateObj = new Date(endDate.split('/').reverse().join('-'));
      filteredLeaves = filteredLeaves.filter(leave => {
        if (!leave.START_DATE) return false;
        const leaveStartDate = new Date(leave.START_DATE);
        return leaveStartDate <= endDateObj;
      });
    }

    const transformedLeaves = filteredLeaves.map(leave => ({
      id: `leave_${leave.EMP_ID}_${leave.START_DATE}`,
      leaveId: leave.EMP_ID, // Using EMP_ID as leave identifier
      employeeId: leave.EMP_ID,
      employeeName: leave.FULL_NAME,
      unitId: leave.UNIT_ID,
      unitDesc: leave.UNIT_DESC,
      startDate: leave.START_DATE,
      usedHolidays: leave.USED_HLN || 0,
      usedSick: leave.USED_SLN || 0,
      usedSickNoMed: leave.USED_SLN_NO_MED || 0,
      usedBusiness: leave.USED_BLP || 0,
      usedOtherLeave: leave.USED_BLN || 0,
      totalHolidayEntitlement: leave.SUM_HLN || 0,
      totalBusinessEntitlement: leave.SUM_BLS || 0,
      type: 'leave',
      isAllDay: true,
      color: '#2196F3' // Blue color for leave events
    }));

    logger.info(`Retrieved ${transformedLeaves.length} leave records for year ${yearNum}`);

    res.status(200).json(formatResponse(
      true,
      'Leave events retrieved successfully',
      {
        leaves: transformedLeaves,
        year: yearNum,
        dateRange: { start, end },
        count: transformedLeaves.length,
        employeeFilter: employeeId || 'all',
        note: 'Employee and date range filtering applied client-side. Consider updating SQL for better performance.'
      }
    ));
  } catch (error) {
    logger.error('Error retrieving leave events:', error);
    return next(new ApiError('Failed to retrieve leave events', 500));
  }
});

/**
 * Get unified calendar view with holidays, leaves, and events
 * @route GET /api/calendar/unified
 */
exports.getUnifiedCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, userId } = req.query;
  
  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  // Execute unified calendar query (SQL_NO: 1003)
  const calendarData = await executeSqlById(1003, {
    as_start_date: startDate,
    as_end_date: endDate,
    as_user_id: userId || null
  });

  const transformedData = calendarData.map(day => ({
    date: day.FORMATTED_DATE,
    dayName: day.DAY_NAME.trim(),
    isWeekend: day.IS_WEEKEND === 'Y',
    isHoliday: day.IS_HOLIDAY === 'Y',
    eventsSummary: day.EVENTS_SUMMARY,
    counts: {
      holidays: day.HOLIDAY_COUNT,
      leaves: day.LEAVE_COUNT,
      events: day.EVENT_COUNT,
      total: day.HOLIDAY_COUNT + day.LEAVE_COUNT + day.EVENT_COUNT
    },
    hasEvents: (day.HOLIDAY_COUNT + day.LEAVE_COUNT + day.EVENT_COUNT) > 0
  }));

  res.status(200).json(formatResponse(
    true,
    'Unified calendar retrieved successfully',
    {
      calendar: transformedData,
      dateRange: { startDate, endDate },
      summary: {
        totalDays: transformedData.length,
        weekends: transformedData.filter(d => d.isWeekend).length,
        holidays: transformedData.filter(d => d.isHoliday).length,
        daysWithEvents: transformedData.filter(d => d.hasEvents).length
      }
    }
  ));
});

/**
 * Get employee leave balance with holiday impact
 * @route GET /api/calendar/leave-balance/:employeeId
 */
exports.getLeaveBalance = asyncHandler(async (req, res, next) => {
  const { employeeId } = req.params;
  const { year } = req.query;
  
  if (!employeeId) {
    return next(new ApiError('Employee ID is required', 400));
  }

  const currentYear = year || new Date().getFullYear().toString();
  
  // Execute leave balance query (SQL_NO: 1004)
  const balanceData = await executeSqlById(1004, {
    as_emp_id: employeeId,
    as_yyyy: currentYear
  });

  if (balanceData.length === 0) {
    return next(new ApiError('Employee not found or no leave data available', 404));
  }

  const balance = balanceData[0];
  const transformedBalance = {
    employeeId: balance.EMP_ID,
    employeeName: balance.EMPLOYEE_NAME,
    employmentStart: balance.EMPLOYMENT_START,
    year: parseInt(currentYear),
    leaveTypes: {
      holiday: {
        entitlement: balance.HOLIDAY_ENTITLEMENT,
        used: balance.HOLIDAY_USED,
        remaining: balance.HOLIDAY_REMAINING,
        utilizationRate: balance.HOLIDAY_ENTITLEMENT > 0 
          ? Math.round((balance.HOLIDAY_USED / balance.HOLIDAY_ENTITLEMENT) * 100) 
          : 0
      },
      sick: {
        entitlement: balance.SICK_ENTITLEMENT,
        used: balance.SICK_USED,
        remaining: balance.SICK_REMAINING,
        utilizationRate: balance.SICK_ENTITLEMENT > 0 
          ? Math.round((balance.SICK_USED / balance.SICK_ENTITLEMENT) * 100) 
          : 0
      },
      business: {
        entitlement: balance.BUSINESS_ENTITLEMENT,
        used: balance.BUSINESS_USED,
        remaining: balance.BUSINESS_REMAINING,
        utilizationRate: balance.BUSINESS_ENTITLEMENT > 0 
          ? Math.round((balance.BUSINESS_USED / balance.BUSINESS_ENTITLEMENT) * 100) 
          : 0
      }
    },
    holidayImpact: {
      workingDaysLost: balance.HOLIDAY_IMPACT_DAYS,
      description: `${balance.HOLIDAY_IMPACT_DAYS} working days are holidays in ${currentYear}`
    }
  };

  res.status(200).json(formatResponse(
    true,
    'Leave balance retrieved successfully',
    transformedBalance
  ));
});

/**
 * Get calendar events for a specific month with holiday integration (mobile optimized)
 * @route GET /api/calendar/month/:year/:month
 */
exports.getMonthCalendarWithHolidays = asyncHandler(async (req, res, next) => {
  const { year, month } = req.params;
  const { includeLeaves = 'true', includeHolidays = 'true' } = req.query;
  
  // Validate parameters
  if (!year || !month || month < 1 || month > 12) {
    return next(new ApiError('Valid year and month parameters are required', 400));
  }

  // Calculate month date range
  const startDate = `01/${month.padStart(2, '0')}/${year}`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${lastDay}/${month.padStart(2, '0')}/${year}`;

  const results = {};

  // Fetch holidays if requested
  if (includeHolidays === 'true') {
    const holidays = await executeSqlById(1001, {
      as_yyyy: parseInt(year),
      as_start_date: startDate,
      as_end_date: endDate
    });
    
    results.holidays = holidays.map(h => ({
      date: h.FORMATTED_DATE,
      title: h.DESCRIPTION,
      type: 'holiday',
      color: getHolidayColor(h.CATEGORY)
    }));
  }

  // Fetch leaves if requested  
  if (includeLeaves === 'true') {
    const leaves = await executeSqlById(1002, {
      as_yyyy: year,
      as_start_date: startDate,
      as_end_date: endDate,
      as_emp_id: '%'
    });
    
    results.leaves = leaves.map(l => ({
      date: l.LEAVE_DATE,
      employeeName: l.EMPLOYEE_NAME,
      leaveType: l.LEAVE_TYPE,
      duration: l.DURATION,
      color: l.DISPLAY_COLOR,
      type: 'leave'
    }));
  }

  res.status(200).json(formatResponse(
    true,
    'Month calendar retrieved successfully',
    {
      year: parseInt(year),
      month: parseInt(month),
      monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
      dateRange: { startDate, endDate },
      ...results,
      summary: {
        holidayCount: results.holidays?.length || 0,
        leaveCount: results.leaves?.length || 0
      }
    }
  ));
});

/**
 * Helper function to get holiday color based on category
 * @param {string} category - Holiday category
 * @returns {string} - Color hex code
 */
function getHolidayColor(category) {
  const colorMap = {
    'HOLIDAY': '#FF5722',    // Deep Orange
    'WEEKEND': '#9E9E9E',    // Grey
    'NON_WORK': '#607D8B'    // Blue Grey
  };
  return colorMap[category] || '#795548'; // Brown for unknown
}