const { executeQuery } = require("../config/database");
const logger = require("../utils/logger");

class Employee {
  /**
   * Get all employees
   * @returns {Promise<Array>} - Array of employees
   */
  static async findAll() {
    try {
      const sql = `
        SELECT 
          ORG_ID,
          EMP_ID,
          EMP_FNAME,
          EMP_LNAME
        FROM KPDBA.EMPLOYEE
        ORDER BY EMP_FNAME, EMP_LNAME
      `;

      const result = await executeQuery(sql);
      
      return result.rows.map(employee => ({
        orgId: employee.ORG_ID,
        empId: employee.EMP_ID,
        firstName: employee.EMP_FNAME,
        lastName: employee.EMP_LNAME,
        fullName: `${employee.EMP_FNAME} ${employee.EMP_LNAME}`.trim()
      }));
    } catch (error) {
      logger.error("Error finding all employees:", error);
      throw error;
    }
  }

  /**
   * Find employee by ID
   * @param {string} empId - Employee ID
   * @returns {Promise<Object|null>} - Employee object or null
   */
  static async findById(empId) {
    try {
      const sql = `
        SELECT 
          ORG_ID,
          EMP_ID,
          EMP_FNAME,
          EMP_LNAME
        FROM KPDBA.EMPLOYEE
        WHERE EMP_ID = :empId
      `;

      const result = await executeQuery(sql, { empId });
      
      if (result.rows.length === 0) {
        return null;
      }

      const employee = result.rows[0];
      return {
        orgId: employee.ORG_ID,
        empId: employee.EMP_ID,
        firstName: employee.EMP_FNAME,
        lastName: employee.EMP_LNAME,
        fullName: `${employee.EMP_FNAME} ${employee.EMP_LNAME}`.trim()
      };
    } catch (error) {
      logger.error("Error finding employee by ID:", error);
      throw error;
    }
  }

  /**
   * Search employees by name or ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Array of matching employees
   */
  static async search(searchTerm) {
    try {
      const sql = `
        SELECT 
          ORG_ID,
          EMP_ID,
          EMP_FNAME,
          EMP_LNAME
        FROM KPDBA.EMPLOYEE
        WHERE UPPER(EMP_FNAME) LIKE UPPER(:searchTerm)
           OR UPPER(EMP_LNAME) LIKE UPPER(:searchTerm)
           OR UPPER(EMP_ID) LIKE UPPER(:searchTerm)
           OR UPPER(EMP_FNAME || ' ' || EMP_LNAME) LIKE UPPER(:searchTerm)
        ORDER BY EMP_FNAME, EMP_LNAME
      `;

      const searchPattern = `%${searchTerm}%`;
      const result = await executeQuery(sql, { searchTerm: searchPattern });
      
      return result.rows.map(employee => ({
        orgId: employee.ORG_ID,
        empId: employee.EMP_ID,
        firstName: employee.EMP_FNAME,
        lastName: employee.EMP_LNAME,
        fullName: `${employee.EMP_FNAME} ${employee.EMP_LNAME}`.trim()
      }));
    } catch (error) {
      logger.error("Error searching employees:", error);
      throw error;
    }
  }
}

module.exports = { Employee };