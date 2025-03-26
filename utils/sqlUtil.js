const { executeQuery } = require('../config/database');
const logger = require('./logger');
const config = require('../config/config');

/**
 * Get SQL statement from KPDBA.SQL_TAB_SOA table
 * @param {number} sqlNo - SQL number from SQL_TAB_SOA
 * @returns {Promise<string>} - SQL statement
 */
async function getSqlFromTabSoa(sqlNo) {
  try {
    const sql = `
      SELECT SQL_STMT FROM KPDBA.SQL_TAB_SOA WHERE SQL_NO = :sqlNo
    `;
    
    const result = await executeQuery(sql, { sqlNo });
    
    if (result.rows.length === 0) {
      throw new Error(`No SQL statement found with number: ${sqlNo}`);
    }
    
    return result.rows[0].SQL_STMT;
  } catch (error) {
    logger.error(`Error getting SQL from SQL_TAB_SOA (${sqlNo}):`, error);
    throw error;
  }
}

/**
 * Execute SQL query by SQL number with parameters
 * @param {number} sqlNo - SQL number from SQL_TAB_SOA
 * @param {Array|string} params - Parameters for the query
 * @returns {Promise<Array>} - Query result rows
 */
async function executeSqlById(sqlNo, params = []) {
  try {
    // Get SQL statement
    const sqlStmt = await getSqlFromTabSoa(sqlNo);
    
    // Process parameters
    let binds = {};
    if (typeof params === 'string') {
      // Single parameter
      binds.param1 = params;
    } else if (Array.isArray(params)) {
      // Multiple parameters
      params.forEach((param, index) => {
        binds[`param${index + 1}`] = param;
      });
    }
    
    // Execute query
    const result = await executeQuery(sqlStmt, binds);
    
    return result.rows;
  } catch (error) {
    logger.error(`Error executing SQL by ID (${sqlNo}):`, error);
    throw error;
  }
}

/**
 * Get version information
 * @param {string} programName - Program name
 * @returns {Promise<string>} - Version string
 */
async function getVersion(programName) {
  try {
    const rows = await executeSqlById(config.sqlTableIds.SQLTAB_GET_VERSION, programName);
    
    if (rows.length === 0) {
      return '';
    }
    
    return rows[0].FILE_VERSION;
  } catch (error) {
    logger.error('Error getting version:', error);
    return '';
  }
}

/**
 * Get company and database information
 * @returns {Promise<Array>} - Company and database information
 */
async function getCompanyDatabase() {
  try {
    return await executeSqlById(config.sqlTableIds.SQLTAB_GET_COMPANYDATABASE);
  } catch (error) {
    logger.error('Error getting company database:', error);
    return [];
  }
}

/**
 * Get profile information by topic name
 * @param {string} topicName - Topic name
 * @returns {Promise<string>} - Topic text
 */
async function getProfile(topicName) {
  try {
    const sql = `
      SELECT TOPIC_TEXT FROM KPDBA.PROFILE WHERE TOPIC_NAME = :topicName
    `;
    
    const result = await executeQuery(sql, { topicName });
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0].TOPIC_TEXT;
  } catch (error) {
    logger.error(`Error getting profile for ${topicName}:`, error);
    return null;
  }
}

/**
 * Update profile information
 * @param {string} topicName - Topic name
 * @param {string} topicText - Topic text
 * @returns {Promise<boolean>} - True if updated successfully
 */
async function updateProfile(topicName, topicText) {
  try {
    const sql = `
      UPDATE KPDBA.PROFILE 
      SET TOPIC_TEXT = :topicText 
      WHERE TOPIC_NAME = :topicName
    `;
    
    await executeQuery(sql, { topicName, topicText });
    return true;
  } catch (error) {
    logger.error(`Error updating profile for ${topicName}:`, error);
    return false;
  }
}

module.exports = {
  getSqlFromTabSoa,
  executeSqlById,
  getVersion,
  getCompanyDatabase,
  getProfile,
  updateProfile
};