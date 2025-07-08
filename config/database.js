const oracledb = require('oracledb');
const logger = require('../utils/logger');
require('dotenv').config({ path: `./.env.dev` });

try {
  oracledb.initOracleClient();
} catch (err) {
  // If the error is that the Oracle Client is already initialized, we can ignore it
  if (err.message.includes('ORA-48122: Oracle client already initialized')) {
    logger.info('Oracle Client already initialized');
  } else {
    logger.error('Error initializing Oracle Client:', err);
    throw err;
  }
}

/**
 * Get database configuration based on database location
 * @param {string} dblocate - Database location identifier (default: 'KPRAUD')
 * @returns {Object} - Database configuration object
 */
function getDbConfig(dblocate) {
  dblocate = dblocate || 'KPRAUD';
  
  return {
    user: process.env[`DB_USER_${dblocate}`],
    password: process.env[`DB_PASSWORD_${dblocate}`],
    connectString: process.env[`DB_CONNECT_STRING_${dblocate}`]
  };
}

/**
 * Connect to Oracle database
 * @param {string} dblocate - Database location identifier
 * @returns {Promise<Connection>} - Oracle connection object
 */

async function connectToDatabase(dblocate) {
  const dbConfig = {
    user: process.env.DB_USER_KPRAUD,
    password: process.env.DB_PASSWORD_KPRAUD,
    connectString: process.env.DB_CONNECT_STRING_KPRAUD
  }
//   console.log(dbConfig)
    try {
      const connection = await oracledb.getConnection(dbConfig); 
      return connection;
    } catch (error) {
      throw new Error(error);
    }
  }

/**
 * Execute a SQL query
 * @param {string} sql - SQL query to execute
 * @param {Object} binds - Bind variables
 * @param {Object} options - Query options
 * @param {string} dblocate - Database location identifier
 * @returns {Promise<Object>} - Query result
 */
async function executeQuery(sql, binds = {}, options = {}, dblocate) {
  let connection;
  
  try {
    connection = await connectToDatabase(dblocate);
    
    // Set default options
    const defaultOptions = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true
    };
    
    const result = await connection.execute(sql, binds, { ...defaultOptions, ...options });
    connection.commit();
    return result;
  } catch (error) {
    logger.error('Error executing query:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        logger.error('Error closing connection:', error);
      }
    }
  }
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} transactionFunction - Function that contains the queries to execute
 * @param {string} dblocate - Database location identifier
 * @returns {Promise<any>} - Transaction result
 */
async function executeTransaction(transactionFunction, dblocate) {
  let connection;
  
  try {
    connection = await connectToDatabase(dblocate);
    
    // Disable autoCommit for transaction
    await connection.execute('BEGIN', {}, { autoCommit: false });
    
    // Execute the transaction function with the connection
    const result = await transactionFunction(connection);
    
    // Commit the transaction
    await connection.commit();
    
    return result;
  } catch (error) {
    // Rollback the transaction on error
    if (connection) {
      try {
        await connection.rollback();
        logger.warn('Transaction rolled back due to error');
      } catch (rollbackError) {
        logger.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    logger.error('Error executing transaction:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        logger.error('Error closing connection:', error);
      }
    }
  }
}

/**
 * Execute query with a specific connection (for use in transactions)
 * @param {Connection} connection - Oracle connection object
 * @param {string} sql - SQL query to execute
 * @param {Object} binds - Bind variables
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Query result
 */
async function executeQueryWithConnection(connection, sql, binds = {}, options = {}) {
  try {
    const defaultOptions = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: false // Don't auto-commit in transactions
    };
    
    const result = await connection.execute(sql, binds, { ...defaultOptions, ...options });
    return result;
  } catch (error) {
    logger.error('Error executing query with connection:', error);
    throw error;
  }
}

module.exports = {
  getDbConfig,
  connectToDatabase,
  executeQuery,
  executeTransaction,
  executeQueryWithConnection,
  oracledb
};