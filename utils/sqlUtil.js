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
 * Validate SQL parameters against SQL statement placeholders
 * @param {string} sqlStmt - SQL statement with placeholders
 * @param {Object} params - Parameters object
 * @returns {Object} - Validated parameters object
 */
function validateSqlParams(sqlStmt, params) {
  // Extract parameter placeholders from SQL statement
  const sqlParamMatches = sqlStmt.match(/:(\w+)/g) || [];
  const expectedParams = sqlParamMatches.map(p => p.substring(1));
  const providedParams = Object.keys(params);
  
  // Check for missing required parameters
  const missing = expectedParams.filter(p => !providedParams.includes(p));
  const extra = providedParams.filter(p => !expectedParams.includes(p));
  
  if (missing.length > 0) {
    throw new Error(`Missing required SQL parameters: ${missing.join(', ')} for SQL statement: ${sqlStmt.substring(0, 100)}...`);
  }
  
  if (extra.length > 0) {
    logger.warn(`Extra parameters provided (will be ignored): ${extra.join(', ')}`);
    // Remove extra parameters to prevent potential issues
    const validatedParams = {};
    expectedParams.forEach(param => {
      if (params[param] !== undefined) {
        validatedParams[param] = params[param];
      }
    });
    return validatedParams;
  }
  
  return params;
}

/**
 * Sanitize SQL parameter to prevent injection
 * @param {any} param - Parameter value to sanitize
 * @returns {any} - Sanitized parameter value
 */
function sanitizeSqlParam(param) {
  if (typeof param === 'string') {
    // Basic SQL injection prevention - remove dangerous characters
    return param.replace(/[';-]/g, '').trim();
  }
  if (typeof param === 'number') {
    // Ensure numbers are valid
    if (isNaN(param) || !isFinite(param)) {
      throw new Error(`Invalid numeric parameter: ${param}`);
    }
  }
  return param;
}

/**
 * Execute SQL query by SQL number with parameters
 * @param {number} sqlNo - SQL number from SQL_TAB_SOA
 * @param {Object|Array|string} params - Parameters for the query
 * @returns {Promise<Array>} - Query result rows
 */
async function executeSqlById(sqlNo, params = {}) {
  try {
    // Get SQL statement
    const sqlStmt = await getSqlFromTabSoa(sqlNo);
    
    let binds = {};
    
    // Handle different parameter formats
    if (typeof params === 'string') {
      // Single parameter - assume it maps to first placeholder
      const sqlParamMatches = sqlStmt.match(/:(\w+)/g) || [];
      if (sqlParamMatches.length > 0) {
        const firstParam = sqlParamMatches[0].substring(1);
        binds[firstParam] = sanitizeSqlParam(params);
      } else {
        binds.param1 = sanitizeSqlParam(params);
      }
    } else if (Array.isArray(params)) {
      // Array parameters - map to param1, param2, etc.
      params.forEach((param, index) => {
        binds[`param${index + 1}`] = sanitizeSqlParam(param);
      });
    } else if (typeof params === 'object' && params !== null) {
      // Object parameters - sanitize each value
      Object.keys(params).forEach(key => {
        binds[key] = sanitizeSqlParam(params[key]);
      });
      
      // Validate parameters against SQL statement
      binds = validateSqlParams(sqlStmt, binds);
    }
    
    logger.info(`Executing SQL ${sqlNo} with parameters:`, Object.keys(binds));
    
    // Execute query
    const result = await executeQuery(sqlStmt, binds);
    
    return result.rows;
  } catch (error) {
    logger.error(`Error executing SQL by ID (${sqlNo}):`, {
      error: error.message,
      sqlNo,
      paramKeys: typeof params === 'object' ? Object.keys(params) : typeof params
    });
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