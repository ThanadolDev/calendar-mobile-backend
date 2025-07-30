const db = require('../config/database');
const logger = require('../utils/logger');

class Calendar {
  /**
   * Create a new calendar event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  static async create(eventData) {
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
      status,
      crOid,
      crUid
    } = eventData;

    const query = `
      INSERT INTO calendar_events (
        CE_TITLE, CE_DESCRIPTION, CE_START_DATE, CE_END_DATE, 
        CE_START_TIME, CE_END_TIME, CE_IS_ALL_DAY, CE_RECURRENCE,
        CE_LOCATION, CE_ATTENDEES, CE_CATEGORY, CE_PRIORITY,
        CE_STATUS, CR_OID, CR_UID, CR_DATE, UPDATE_DATE
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      title,
      description || null,
      startDate,
      endDate,
      startTime || null,
      endTime || null,
      isAllDay ? 1 : 0,
      recurrence || null,
      location || null,
      JSON.stringify(attendees || []),
      category || 'general',
      priority || 'medium',
      status || 'confirmed',
      crOid,
      crUid
    ];

    try {
      const result = await db.execute(query, values);
      return await this.findById(result.insertId);
    } catch (error) {
      logger.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Find event by ID
   * @param {number} id - Event ID
   * @returns {Promise<Object|null>} Event or null
   */
  static async findById(id) {
    const query = `
      SELECT 
        CE_ID as id,
        CE_TITLE as title,
        CE_DESCRIPTION as description,
        CE_START_DATE as startDate,
        CE_END_DATE as endDate,
        CE_START_TIME as startTime,
        CE_END_TIME as endTime,
        CE_IS_ALL_DAY as isAllDay,
        CE_RECURRENCE as recurrence,
        CE_LOCATION as location,
        CE_ATTENDEES as attendees,
        CE_CATEGORY as category,
        CE_PRIORITY as priority,
        CE_STATUS as status,
        CR_OID as crOid,
        CR_UID as crUid,
        CR_DATE as createdDate,
        UPDATE_DATE as updatedDate
      FROM calendar_events 
      WHERE CE_ID = ? AND CE_STATUS != 'deleted'
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return null;

      const event = rows[0];
      // Parse attendees JSON
      if (event.attendees) {
        try {
          event.attendees = JSON.parse(event.attendees);
        } catch (e) {
          event.attendees = [];
        }
      }

      return event;
    } catch (error) {
      logger.error('Error finding calendar event by ID:', error);
      throw new Error('Failed to find calendar event');
    }
  }

  /**
   * Get events by date range
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Events array
   */
  static async getEventsByDateRange(options = {}) {
    const {
      startDate,
      endDate,
      userId,
      category,
      status = 'confirmed',
      limit = 100
    } = options;

    let query = `
      SELECT 
        CE_ID as id,
        CE_TITLE as title,
        CE_DESCRIPTION as description,
        CE_START_DATE as startDate,
        CE_END_DATE as endDate,
        CE_START_TIME as startTime,
        CE_END_TIME as endTime,
        CE_IS_ALL_DAY as isAllDay,
        CE_RECURRENCE as recurrence,
        CE_LOCATION as location,
        CE_ATTENDEES as attendees,
        CE_CATEGORY as category,
        CE_PRIORITY as priority,
        CE_STATUS as status,
        CR_UID as createdBy,
        CR_DATE as createdDate
      FROM calendar_events 
      WHERE CE_STATUS != 'deleted'
    `;

    const values = [];

    if (startDate) {
      query += ' AND CE_START_DATE >= ?';
      values.push(startDate);
    }

    if (endDate) {
      query += ' AND CE_END_DATE <= ?';
      values.push(endDate);
    }

    if (userId) {
      query += ' AND (CR_UID = ? OR JSON_CONTAINS(CE_ATTENDEES, JSON_QUOTE(?)))';
      values.push(userId, userId);
    }

    if (category) {
      query += ' AND CE_CATEGORY = ?';
      values.push(category);
    }

    if (status) {
      query += ' AND CE_STATUS = ?';
      values.push(status);
    }

    query += ' ORDER BY CE_START_DATE ASC, CE_START_TIME ASC LIMIT ?';
    values.push(limit);

    try {
      const [rows] = await db.execute(query, values);
      
      return rows.map(event => {
        // Parse attendees JSON
        if (event.attendees) {
          try {
            event.attendees = JSON.parse(event.attendees);
          } catch (e) {
            event.attendees = [];
          }
        }
        return event;
      });
    } catch (error) {
      logger.error('Error getting events by date range:', error);
      throw new Error('Failed to get calendar events');
    }
  }

  /**
   * Get events by month
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Events array
   */
  static async getEventsByMonth(year, month, userId) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    return this.getEventsByDateRange({
      startDate,
      endDate,
      userId
    });
  }

  /**
   * Update calendar event
   * @param {number} id - Event ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated event or null
   */
  static async update(id, updateData) {
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
      status,
      updateOid,
      updateUid
    } = updateData;

    const query = `
      UPDATE calendar_events SET
        CE_TITLE = COALESCE(?, CE_TITLE),
        CE_DESCRIPTION = COALESCE(?, CE_DESCRIPTION),
        CE_START_DATE = COALESCE(?, CE_START_DATE),
        CE_END_DATE = COALESCE(?, CE_END_DATE),
        CE_START_TIME = COALESCE(?, CE_START_TIME),
        CE_END_TIME = COALESCE(?, CE_END_TIME),
        CE_IS_ALL_DAY = COALESCE(?, CE_IS_ALL_DAY),
        CE_RECURRENCE = COALESCE(?, CE_RECURRENCE),
        CE_LOCATION = COALESCE(?, CE_LOCATION),
        CE_ATTENDEES = COALESCE(?, CE_ATTENDEES),
        CE_CATEGORY = COALESCE(?, CE_CATEGORY),
        CE_PRIORITY = COALESCE(?, CE_PRIORITY),
        CE_STATUS = COALESCE(?, CE_STATUS),
        UPDATE_OID = ?,
        UPDATE_UID = ?,
        UPDATE_DATE = NOW()
      WHERE CE_ID = ? AND CE_STATUS != 'deleted'
    `;

    const values = [
      title,
      description,
      startDate,
      endDate,
      startTime,
      endTime,
      isAllDay !== undefined ? (isAllDay ? 1 : 0) : null,
      recurrence,
      location,
      attendees ? JSON.stringify(attendees) : null,
      category,
      priority,
      status,
      updateOid,
      updateUid,
      id
    ];

    try {
      const [result] = await db.execute(query, values);
      if (result.affectedRows === 0) return null;
      
      return await this.findById(id);
    } catch (error) {
      logger.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Delete calendar event (soft delete)
   * @param {number} id - Event ID
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id, orgId, userId) {
    const query = `
      UPDATE calendar_events 
      SET CE_STATUS = 'deleted', UPDATE_OID = ?, UPDATE_UID = ?, UPDATE_DATE = NOW()
      WHERE CE_ID = ? AND CE_STATUS != 'deleted'
    `;

    try {
      const [result] = await db.execute(query, [orgId, userId, id]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Get user's calendar statistics
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Statistics object
   */
  static async getUserStats(userId, options = {}) {
    const { year, month } = options;

    let dateCondition = '';
    const values = [userId];

    if (year && month) {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      dateCondition = 'AND CE_START_DATE BETWEEN ? AND ?';
      values.push(startDate, endDate);
    } else if (year) {
      dateCondition = 'AND YEAR(CE_START_DATE) = ?';
      values.push(year);
    }

    const query = `
      SELECT 
        COUNT(*) as totalEvents,
        SUM(CASE WHEN CE_STATUS = 'confirmed' THEN 1 ELSE 0 END) as confirmedEvents,
        SUM(CASE WHEN CE_STATUS = 'pending' THEN 1 ELSE 0 END) as pendingEvents,
        SUM(CASE WHEN CE_STATUS = 'cancelled' THEN 1 ELSE 0 END) as cancelledEvents,
        SUM(CASE WHEN CE_CATEGORY = 'meeting' THEN 1 ELSE 0 END) as meetings,
        SUM(CASE WHEN CE_CATEGORY = 'task' THEN 1 ELSE 0 END) as tasks,
        SUM(CASE WHEN CE_CATEGORY = 'event' THEN 1 ELSE 0 END) as events
      FROM calendar_events 
      WHERE (CR_UID = ? OR JSON_CONTAINS(CE_ATTENDEES, JSON_QUOTE(?)))
        AND CE_STATUS != 'deleted'
        ${dateCondition}
    `;

    values.push(userId); // Add userId again for attendees check

    try {
      const [rows] = await db.execute(query, values);
      return rows[0] || {
        totalEvents: 0,
        confirmedEvents: 0,
        pendingEvents: 0,
        cancelledEvents: 0,
        meetings: 0,
        tasks: 0,
        events: 0
      };
    } catch (error) {
      logger.error('Error getting user calendar stats:', error);
      throw new Error('Failed to get calendar statistics');
    }
  }
}

module.exports = Calendar;