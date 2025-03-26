const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class Diecut {
  /**
   * Find all active diecuts
   * @returns {Promise<Array>} - Array of diecut objects
   */
  static async findAll() {
    try {
      const sql = `
        SELECT * FROM KPDBA.DIECUT 
        WHERE STATUS = 'ACTIVE'
      `;
      
      const result = await executeQuery(sql);
      return result.rows;
    } catch (error) {
      logger.error('Error finding diecuts:', error);
      throw error;
    }
  }

  /**
   * Find a diecut by ID
   * @param {string} diecutId - Diecut ID
   * @returns {Promise<Object>} - Diecut object
   */
  static async findById(diecutId) {
    try {
      const sql = `
        SELECT * FROM KPDBA.DIECUT 
        WHERE DIECUT_ID = :diecutId
        AND STATUS = 'ACTIVE'
      `;
      
      const result = await executeQuery(sql, { diecutId });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding diecut by ID:', error);
      throw error;
    }
  }

  /**
   * Find a diecut with its serial numbers
   * @param {string} diecutId - Diecut ID
   * @returns {Promise<Object>} - Diecut object with serial numbers
   */
  static async findWithSerialNumbers(diecutId) {
    try {
      // Get diecut details
      const diecut = await this.findById(diecutId);
      
      if (!diecut) {
        return null;
      }
      
      // Get associated serial numbers
      const serialSql = `
        SELECT * FROM KPDBA.DIECUT_SN 
        WHERE DIECUT_ID = :diecutId
        AND STATUS = 'ACTIVE'
      `;
      
      const serialResult = await executeQuery(serialSql, { diecutId });
      
      // Add serial numbers to diecut object
      diecut.serialNumbers = serialResult.rows;
      
      return diecut;
    } catch (error) {
      logger.error('Error finding diecut with serial numbers:', error);
      throw error;
    }
  }

  /**
   * Create a new diecut
   * @param {Object} diecutData - Diecut data
   * @returns {Promise<Object>} - Created diecut
   */
  static async create(diecutData) {
    try {
      const sql = `
        INSERT INTO KPDBA.DIECUT (
          DIECUT_ID, DIECUT_NAME, DIECUT_TYPE, DIECUT_DESC,
          IMAGE_PATH, STATUS, CREATED_BY, UPDATED_BY,
          CREATED_AT, UPDATED_AT
        ) VALUES (
          :diecutId, :diecutName, :diecutType, :diecutDesc,
          :imagePath, :status, :createdBy, :updatedBy,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
      
      await executeQuery(sql, {
        diecutId: diecutData.diecutId,
        diecutName: diecutData.diecutName,
        diecutType: diecutData.diecutType,
        diecutDesc: diecutData.diecutDesc || null,
        imagePath: diecutData.imagePath || null,
        status: diecutData.status || 'ACTIVE',
        createdBy: diecutData.createdBy,
        updatedBy: diecutData.updatedBy || diecutData.createdBy
      });
      
      // Return created diecut
      return await this.findById(diecutData.diecutId);
    } catch (error) {
      logger.error('Error creating diecut:', error);
      throw error;
    }
  }

  /**
   * Update a diecut
   * @param {string} diecutId - Diecut ID
   * @param {Object} diecutData - Diecut data to update
   * @returns {Promise<Object>} - Updated diecut
   */
  static async update(diecutId, diecutData) {
    try {
      let updateFields = [];
      const binds = { diecutId };
      
      // Process fields for update
      Object.keys(diecutData).forEach(key => {
        if (key === 'diecutId') {
          // Skip ID field as it's used in WHERE clause
          return;
        }
        
        const fieldName = key.replace(/([A-Z])/g, '_$1').toUpperCase();
        updateFields.push(`${fieldName} = :${key}`);
        binds[key] = diecutData[key];
      });
      
      // Always update UPDATED_AT
      updateFields.push('UPDATED_AT = CURRENT_TIMESTAMP');
      
      const sql = `
        UPDATE KPDBA.DIECUT
        SET ${updateFields.join(', ')}
        WHERE DIECUT_ID = :diecutId
      `;
      
      await executeQuery(sql, binds);
      
      // Return updated diecut
      return await this.findById(diecutId);
    } catch (error) {
      logger.error('Error updating diecut:', error);
      throw error;
    }
  }

  /**
   * Soft delete a diecut
   * @param {string} diecutId - Diecut ID
   * @param {string} updatedBy - User ID who updated the record
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  static async delete(diecutId, updatedBy) {
    try {
      const sql = `
        UPDATE KPDBA.DIECUT
        SET STATUS = 'INACTIVE', UPDATED_BY = :updatedBy, UPDATED_AT = CURRENT_TIMESTAMP
        WHERE DIECUT_ID = :diecutId
      `;
      
      await executeQuery(sql, { diecutId, updatedBy });
      return true;
    } catch (error) {
      logger.error('Error deleting diecut:', error);
      throw error;
    }
  }
}

class DiecutSN {
  /**
   * Get the maximum serial number for a diecut
   * @param {string} diecutId - Diecut ID
   * @returns {Promise<string>} - Maximum serial number
   */
  static async getMaxSerialNumber(diecutId) {
    try {
      const sql = `
        SELECT MAX(TO_NUMBER(SUBSTR(DIECUT_SN, LENGTH(DIECUT_ID) + 2))) AS max_sn 
        FROM KPDBA.DIECUT_SN 
        WHERE DIECUT_ID = :diecutId
      `;
      
      const result = await executeQuery(sql, { diecutId });
      
      if (!result.rows[0].MAX_SN) {
        return '0';
      }
      
      return result.rows[0].MAX_SN.toString();
    } catch (error) {
      logger.error('Error getting max serial number:', error);
      throw error;
    }
  }

  /**
   * Create a new serial number for a diecut
   * @param {Object} snData - Serial number data
   * @returns {Promise<Object>} - Created serial number
   */
  static async create(snData) {
    try {
      const sql = `
        INSERT INTO KPDBA.DIECUT_SN (
          DIECUT_SN, DIECUT_ID, DIECUT_TYPE, DIECUT_AGE,
          STATUS, CREATED_AT, UPDATED_AT
        ) VALUES (
          :diecutSn, :diecutId, :diecutType, :diecutAge,
          :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
      
      await executeQuery(sql, {
        diecutSn: snData.diecutSn,
        diecutId: snData.diecutId,
        diecutType: snData.diecutType,
        diecutAge: snData.diecutAge || 0,
        status: snData.status || 'ACTIVE'
      });
      
      // Return created serial number
      return await this.findById(snData.diecutSn);
    } catch (error) {
      logger.error('Error creating serial number:', error);
      throw error;
    }
  }

  /**
   * Find a serial number by ID
   * @param {string} diecutSn - Serial number
   * @returns {Promise<Object>} - Serial number object
   */
  static async findById(diecutSn) {
    try {
      const sql = `
        SELECT * FROM KPDBA.DIECUT_SN 
        WHERE DIECUT_SN = :diecutSn
      `;
      
      const result = await executeQuery(sql, { diecutSn });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding serial number by ID:', error);
      throw error;
    }
  }
}

class DiecutStatus {
  /**
   * Get diecut status report
   * @param {Object} filters - Optional filters for the report
   * @returns {Promise<Array>} - Array of diecut status objects
   */
  static async getStatusReport(filters = {}) {
    try {
      // SQL query for diecut status report
      const sql = `
        SELECT DSN.DIECUT_ID, DSN.DIECUT_SN, DSN.AGES, DSN.USED, DSN.REMAIN, DSN.DIECUT_NEAR_EXP
        , CASE WHEN DSN.REMAIN <= 0 THEN '1' WHEN DSN.REMAIN <= DSN.DIECUT_NEAR_EXP THEN '2' ELSE '3' END PRIORITY
        , DSN.STATUS, DSN.DIECUT_TYPE, DSN.TL_STATUS, DSN.LAST_MODIFY, DSN.DUE_DATE, DM.MODIFY_TYPE 
        FROM (
            SELECT SN.DIECUT_ID, SN.DIECUT_SN, NVL(SN.DIECUT_AGE,0) AGES
            , CASE 
                WHEN NVL(SN.DIECUT_AGE,0) = 0 THEN 0
                WHEN NVL(UD.USED,0) = 0 THEN NVL(SN.DIECUT_AGE,0) 
                ELSE TRUNC(DIECUT_MAX)
                END  
                AS DIECUT_NEAR_EXP
            , NVL(UD.USED,0) USED 
            , CASE 
                WHEN USED IS NULL THEN NVL(SN.DIECUT_AGE,0) 
                WHEN NVL(SN.DIECUT_AGE,0) - NVL(UD.USED,0) <0 THEN 0 
                ELSE NVL(SN.DIECUT_AGE,0) - NVL(UD.USED,0) 
              END REMAIN  
            , SN.STATUS, SN.TL_STATUS, SN.LAST_MODIFY, SN.DUE_DATE
            , SN.DIECUT_TYPE
            FROM KPDBA.DIECUT_SN SN
            LEFT OUTER JOIN  (
                SELECT WD.DIECUT_SN, SUM(WD.COUNTER_QTY ) USED
                FROM KPDBA.WIP_DIECUT WD
                JOIN KPDBA.DIECUT_SN SN ON WD.DIECUT_SN = SN.DIECUT_SN  
                LEFT JOIN (SELECT DIECUT_SN, MAX(RESET_DATE) LAST_MODIFY FROM KPDBA.DIECUT_RESET_HIST GROUP BY DIECUT_SN) HS ON WD.DIECUT_SN = HS.DIECUT_SN
                WHERE NVL(WD.COUNTER_QTY, 0) > 0   
                AND WD.CR_DATE > NVL(HS.LAST_MODIFY, TO_DATE('01/09/2018','dd/mm/yyyy'))
                GROUP BY WD.DIECUT_SN
            ) UD ON SN.DIECUT_SN = UD.DIECUT_SN
            LEFT JOIN (
                SELECT DIECUT_SN, DIECUT_AGE - ( AVG + (1.96 * (STDDEV / SQRTCOUNTROW)) ) AS DIECUT_MAX 
                FROM (
                    SELECT WD.DIECUT_SN, NVL(SN.DIECUT_AGE,0) AS DIECUT_AGE, 
                                    SQRT( COUNT (1) OVER (ORDER BY WD.DIECUT_SN)) SQRTCOUNTROW,
                                    AVG (COUNTER_QTY) OVER (ORDER BY WD.DIECUT_SN) AVG,
                                    STDDEV (COUNTER_QTY) OVER (ORDER BY WD.DIECUT_SN) STDDEV
                    FROM KPDBA.WIP_DIECUT WD
                    JOIN KPDBA.DIECUT_SN SN ON WD.DIECUT_SN = SN.DIECUT_SN  
                    LEFT JOIN (SELECT DIECUT_SN, MAX(RESET_DATE) LAST_MODIFY FROM KPDBA.DIECUT_RESET_HIST GROUP BY DIECUT_SN) HS ON WD.DIECUT_SN = HS.DIECUT_SN
                    WHERE NVL(WD.COUNTER_QTY, 0) > 0   
                    AND WD.CR_DATE > NVL(HS.LAST_MODIFY, TO_DATE('01/09/2018','dd/mm/yyyy'))
                )
                GROUP BY DIECUT_SN, ( DIECUT_AGE - ( AVG + (1.96 * (STDDEV / SQRTCOUNTROW)) ) )
            ) NE ON SN.DIECUT_SN = NE.DIECUT_SN
            WHERE NVL(SN.STATUS,'F') <> 'F' AND SN.TL_STATUS = 'GOOD'
        ) DSN  
        LEFT JOIN KPDBA.DIECUT_MODIFY DM ON (DSN.DIECUT_SN = DM.DIECUT_SN AND DM.END_TIME IS NULL AND DM.CANCEL_FLAG = 'F')
      `;

      // Apply filters if provided
      let whereClause = '';
      const binds = {};
      
      if (filters.diecutId) {
        whereClause += ' AND DSN.DIECUT_ID = :diecutId';
        binds.diecutId = filters.diecutId;
      }
      
      if (filters.diecutType) {
        whereClause += ' AND DSN.DIECUT_TYPE = :diecutType';
        binds.diecutType = filters.diecutType;
      }
      
      if (filters.priority) {
        whereClause += ' AND CASE WHEN DSN.REMAIN <= 0 THEN \'1\' WHEN DSN.REMAIN <= DSN.DIECUT_NEAR_EXP THEN \'2\' ELSE \'3\' END = :priority';
        binds.priority = filters.priority;
      }
      
      // Add where clause to the query if filters were applied
      let finalSql = sql;
      if (whereClause) {
        // Add a WHERE clause after the main query
        finalSql = `SELECT * FROM (${sql}) WHERE 1=1 ${whereClause}`;
      }
      
      // Add order by clause
      finalSql += ' ORDER BY PRIORITY ASC, REMAIN ASC';
      
      // Execute the query
      const result = await executeQuery(finalSql, binds);
      
      return result.rows;
    } catch (error) {
      logger.error('Error in DiecutStatus.getStatusReport:', error);
      throw error;
    }
  }

  /**
   * Get summary of diecut status grouped by priority
   * @returns {Promise<Object>} - Summary object
   */
  static async getStatusSummary() {
    try {
      const sql = `
        WITH diecut_status AS (
          SELECT 
            DSN.DIECUT_ID, 
            DSN.DIECUT_SN, 
            DSN.DIECUT_TYPE,
            CASE 
              WHEN DSN.REMAIN <= 0 THEN '1' 
              WHEN DSN.REMAIN <= DSN.DIECUT_NEAR_EXP THEN '2' 
              ELSE '3' 
            END AS PRIORITY
          FROM (
              SELECT SN.DIECUT_ID, SN.DIECUT_SN, NVL(SN.DIECUT_AGE,0) AGES
              , CASE 
                  WHEN NVL(SN.DIECUT_AGE,0) = 0 THEN 0
                  WHEN NVL(UD.USED,0) = 0 THEN NVL(SN.DIECUT_AGE,0) 
                  ELSE TRUNC(DIECUT_MAX)
                  END  
                  AS DIECUT_NEAR_EXP
              , NVL(UD.USED,0) USED 
              , CASE 
                  WHEN USED IS NULL THEN NVL(SN.DIECUT_AGE,0) 
                  WHEN NVL(SN.DIECUT_AGE,0) - NVL(UD.USED,0) <0 THEN 0 
                  ELSE NVL(SN.DIECUT_AGE,0) - NVL(UD.USED,0) 
                END REMAIN  
              , SN.STATUS, SN.TL_STATUS, SN.DIECUT_TYPE
              FROM KPDBA.DIECUT_SN SN
              LEFT OUTER JOIN  (
                  SELECT WD.DIECUT_SN, SUM(WD.COUNTER_QTY ) USED
                  FROM KPDBA.WIP_DIECUT WD
                  JOIN KPDBA.DIECUT_SN SN ON WD.DIECUT_SN = SN.DIECUT_SN  
                  LEFT JOIN (SELECT DIECUT_SN, MAX(RESET_DATE) LAST_MODIFY FROM KPDBA.DIECUT_RESET_HIST GROUP BY DIECUT_SN) HS ON WD.DIECUT_SN = HS.DIECUT_SN
                  WHERE NVL(WD.COUNTER_QTY, 0) > 0   
                  AND WD.CR_DATE > NVL(HS.LAST_MODIFY, TO_DATE('01/09/2018','dd/mm/yyyy'))
                  GROUP BY WD.DIECUT_SN
              ) UD ON SN.DIECUT_SN = UD.DIECUT_SN
              LEFT JOIN (
                  SELECT DIECUT_SN, DIECUT_AGE - ( AVG + (1.96 * (STDDEV / SQRTCOUNTROW)) ) AS DIECUT_MAX 
                  FROM (
                      SELECT WD.DIECUT_SN, NVL(SN.DIECUT_AGE,0) AS DIECUT_AGE, 
                                       SQRT( COUNT (1) OVER (ORDER BY WD.DIECUT_SN)) SQRTCOUNTROW,
                                       AVG (COUNTER_QTY) OVER (ORDER BY WD.DIECUT_SN) AVG,
                                       STDDEV (COUNTER_QTY) OVER (ORDER BY WD.DIECUT_SN) STDDEV
                      FROM KPDBA.WIP_DIECUT WD
                      JOIN KPDBA.DIECUT_SN SN ON WD.DIECUT_SN = SN.DIECUT_SN  
                      LEFT JOIN (SELECT DIECUT_SN, MAX(RESET_DATE) LAST_MODIFY FROM KPDBA.DIECUT_RESET_HIST GROUP BY DIECUT_SN) HS ON WD.DIECUT_SN = HS.DIECUT_SN
                      WHERE NVL(WD.COUNTER_QTY, 0) > 0   
                      AND WD.CR_DATE > NVL(HS.LAST_MODIFY, TO_DATE('01/09/2018','dd/mm/yyyy'))
                  )
                  GROUP BY DIECUT_SN, ( DIECUT_AGE - ( AVG + (1.96 * (STDDEV / SQRTCOUNTROW)) ) )
              ) NE ON SN.DIECUT_SN = NE.DIECUT_SN
              WHERE NVL(SN.STATUS,'F') <> 'F' AND SN.TL_STATUS = 'GOOD'
          ) DSN
        )
        SELECT 
          PRIORITY,
          COUNT(*) AS COUNT,
          PRIORITY_DESCRIPTION
        FROM diecut_status
        LEFT JOIN (
          SELECT '1' AS PRIORITY_ID, 'Expired' AS PRIORITY_DESCRIPTION FROM DUAL
          UNION ALL
          SELECT '2' AS PRIORITY_ID, 'Near Expiry' AS PRIORITY_DESCRIPTION FROM DUAL
          UNION ALL
          SELECT '3' AS PRIORITY_ID, 'Good' AS PRIORITY_DESCRIPTION FROM DUAL
        ) PD ON diecut_status.PRIORITY = PD.PRIORITY_ID
        GROUP BY PRIORITY, PRIORITY_DESCRIPTION
        ORDER BY PRIORITY
      `;
      
      // Execute the query
      const result = await executeQuery(sql);
      
      // Transform the result into a more friendly format
      const summary = {
        total: 0,
        priorities: {}
      };
      
      result.rows.forEach(row => {
        summary.priorities[row.PRIORITY_DESCRIPTION.toLowerCase()] = parseInt(row.COUNT, 10);
        summary.total += parseInt(row.COUNT, 10);
      });
      
      return summary;
    } catch (error) {
      logger.error('Error in DiecutStatus.getStatusSummary:', error);
      throw error;
    }
  }
}

module.exports = {
  Diecut,
  DiecutSN,
  DiecutStatus
};