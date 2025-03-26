/**
 * Helper functions for the application
 */

/**
 * Generate a unique serial number for diecut
 * @param {string} diecutId - The diecut ID
 * @param {number} currentMaxSN - The current maximum serial number
 * @returns {string} - The new serial number
 */
exports.generateDiecutSN = (diecutId, currentMaxSN) => {
    const nextSN = parseInt(currentMaxSN || '0', 10) + 1;
    return `${diecutId}-${String(nextSN).padStart(4, '0')}`;
  };
  
  /**
   * Format a response object
   * @param {boolean} success - Whether the request was successful
   * @param {string} message - A message about the result
   * @param {object} data - Any data to return
   * @returns {object} - The formatted response
   */
  exports.formatResponse = (success, message, data = null) => {
    return {
      success,
      message,
      ...(data && { data })
    };
  };
  
  /**
   * Async handler to avoid try-catch blocks in route handlers
   * @param {Function} fn - The function to handle
   * @returns {Function} - The wrapped function
   */
  exports.asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  
  /**
   * Convert a date to SQL format
   * @param {Date} date - The date to convert
   * @returns {string} - The formatted date
   */
  exports.toSqlDate = (date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };