const bcrypt = require('bcryptjs');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class User {
  /**
   * Find a user by user ID and company ID
   * @param {string} userId - User ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} - User object
   */
  static async findByUserAndCompany(userId, orgId) {
    try {
      const sql = `
        SELECT * FROM KPDBA.USERS 
        WHERE USER_ID = :userId 
        AND ORG_ID = :orgId
      `;
      
      const result = await executeQuery(sql, { userId, orgId });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user:', error);
      throw error;
    }
  }

  /**
   * Find a user by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User object
   */
  static async findByUserId(userId) {
    try {
      const sql = `
        SELECT * FROM KPDBA.USERS 
        WHERE USER_ID = :userId
      `;
      
      const result = await executeQuery(sql, { userId });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} - True if passwords match
   */
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  static async create(userData) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const sql = `
        INSERT INTO KPDBA.USERS (
          USER_ID, USER_NAME, PASSWORD, ORG_ID, COMP_ID, 
          IS_ACTIVE, CREATED_AT, UPDATED_AT
        ) VALUES (
          :userId, :userName, :password, :orgId, :compId,
          :isActive, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING * INTO :outputUser
      `;
      
      const outputUser = { type: 'OBJECT', dir: 'OUT' };
      
      const result = await executeQuery(sql, {
        userId: userData.userId,
        userName: userData.userName,
        password: hashedPassword,
        orgId: userData.orgId,
        compId: userData.compId || null,
        isActive: userData.isActive === undefined ? 1 : userData.isActive,
        outputUser
      });
      
      return result.outBinds.outputUser;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update a user
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - Updated user
   */
  static async update(userId, userData) {
    try {
      let updateFields = [];
      const binds = { userId };
      
      // Process fields for update
      Object.keys(userData).forEach(key => {
        if (key === 'password') {
          // Don't include password here - it requires special handling
          return;
        }
        
        const fieldName = key.replace(/([A-Z])/g, '_$1').toUpperCase();
        updateFields.push(`${fieldName} = :${key}`);
        binds[key] = userData[key];
      });
      
      // Handle password update separately if provided
      if (userData.password) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        updateFields.push('PASSWORD = :password');
        binds.password = hashedPassword;
      }
      
      // Always update UPDATED_AT
      updateFields.push('UPDATED_AT = CURRENT_TIMESTAMP');
      
      const sql = `
        UPDATE KPDBA.USERS
        SET ${updateFields.join(', ')}
        WHERE USER_ID = :userId
      `;
      
      await executeQuery(sql, binds);
      
      // Return updated user
      return await this.findByUserId(userId);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }
}

module.exports = User;