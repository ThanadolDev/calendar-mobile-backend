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


  static async saveBlade(bladeData) {
    try {
      const {
        diecutSN,
        diecutAge,
        startTime,
        endTime,
        bladeType,
        multiBladeReason,
        multiBladeRemark,
        probDesc,
        remark
      } = bladeData;

      const formattedStartTime = startTime ? startTime.split('T')[0] : null;
      const formattedEndTime = endTime ? endTime.split('T')[0] : null;
      logger.info(`Saving blade modification for: ${diecutSN}`);

      const updateSNQuery = `
        UPDATE KPDBA.DIECUT_SN
        SET DIECUT_AGE = :diecut_age
        WHERE DIECUT_SN = :diecut_sn
      `;

      await executeQuery(updateSNQuery, {
        diecut_age: diecutAge,
        diecut_sn: diecutSN
      });

      const checkExistingQuery = `
        SELECT COUNT(*) AS count
        FROM KPDBA.DIECUT_MODIFY
        WHERE DIECUT_SN = :diecut_sn
      `;

      const checkResult = await executeQuery(checkExistingQuery, {
        diecut_sn: diecutSN
      });

      const recordExists = checkResult.rows[0].COUNT > 0;

      let modifyQuery;
      if (recordExists) {
        modifyQuery = `
          UPDATE KPDBA.DIECUT_MODIFY
          SET 
            START_TIME = TO_DATE(:start_time, 'YYYY-MM-DD'),
            END_TIME = TO_DATE(:end_time, 'YYYY-MM-DD'),
            BLADE_TYPE = :blade_type,
            MULTI_BLADE_REASON = :multi_blade_reason,
            MULTI_BLADE_REMARK = :multi_blade_remark,
            PROB_DESC = :prob_desc,
            REMARK = :remark
          WHERE DIECUT_SN = :diecut_sn
        `;
      } else {
        modifyQuery = `
          INSERT INTO KPDBA.DIECUT_MODIFY (
  DIECUT_SN, 
  START_TIME, 
  END_TIME, 
  BLADE_TYPE, 
  MULTI_BLADE_REASON, 
  MULTI_BLADE_REMARK, 
  PROB_DESC, 
  REMARK
) VALUES (
  :diecut_sn,
  TO_DATE(:start_time, 'YYYY-MM-DD'),
  TO_DATE(:end_time, 'YYYY-MM-DD'),
  :blade_type,
  :multi_blade_reason,
  :multi_blade_remark,
  :prob_desc,
  :remark
)
        `;
      }
      // console.log(modifyQuery)
      // console.log({
      //   diecut_sn: diecutSN,
      //   start_time: formattedStartTime,
      //   end_time: formattedEndTime,
      //   blade_type: bladeType,
      //   multi_blade_reason: multiBladeReason,
      //   multi_blade_remark: multiBladeRemark,
      //   prob_desc: probDesc,
      //   remark: remark
      // })
      const modifyResult = await executeQuery(modifyQuery, {
        diecut_sn: diecutSN,
        start_time: formattedStartTime || '1900-01-02',
        end_time: formattedEndTime,
        blade_type: bladeType,
        multi_blade_reason: multiBladeReason,
        multi_blade_remark: multiBladeRemark,
        prob_desc: probDesc,
        remark: remark
      });

      const getUpdatedDataQuery = `
        SELECT 
          DS.DIECUT_ID,
          DS.DIECUT_SN,
          DS.DIECUT_AGE,
          DS.STATUS,
          DM.START_TIME,
          DM.END_TIME,
          DM.BLADE_TYPE,
          DM.MULTI_BLADE_REASON,
          DM.MULTI_BLADE_REMARK,
          DM.PROB_DESC,
          DM.REMARK
        FROM 
          KPDBA.DIECUT_SN DS
        LEFT JOIN 
          KPDBA.DIECUT_MODIFY DM ON DS.DIECUT_SN = DM.DIECUT_SN
        WHERE 
          DS.DIECUT_SN = :diecut_sn
      `;

      const updatedData = await executeQuery(getUpdatedDataQuery, {
        diecut_sn: diecutSN
      });

      return {
        success: true,
        message: recordExists ? 'Blade data updated' : 'Blade data created',
        data: updatedData.rows[0]
      };
    } catch (error) {
      logger.error('Error in DiecutService.saveBlade:', error);
      throw error;
    }
  }

  static async saveTypeChange(bladeData) {
    try {
      const {
        diecutId,
        diecutSN,modifyTypeAppvFlag,  ORG_ID, EMP_ID
      } = bladeData;

      logger.info(`Saving blade modification for: ${diecutSN}`);

      const updateSNQuery = `
        UPDATE KPDBA.DIECUT_MODIFY
        SET MODIFY_TYPE_APPV_FLAG = :modifyTypeAppvFlag
        WHERE DIECUT_SN = :diecut_sn
      `;
      console.log(updateSNQuery)

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSN,
        modifyTypeAppvFlag: modifyTypeAppvFlag
      });
 
      return {
        success: true,
        message: 'Blade data updated'
      };

    } catch (error) {
      logger.error('Error in DiecutService.saveBlade:', error);
      throw error;
    }
  }

  static async approveTypeChange(bladeData) {
    try {
      const {
        diecutId, 
      diecutSN,
      modifyType
      } = bladeData;

      logger.info(`Saving blade modification for: ${diecutSN}`);

      const updateSNQuery = `
        UPDATE KPDBA.DIECUT_MODIFY
        SET MODIFY_TYPE_APPV_FLAG = 'A'
        WHERE DIECUT_SN = :diecut_sn
      `;
      console.log(updateSNQuery)

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSN,
      });
 
      return {
        success: true,
        message: 'Blade data updated'
      };

    } catch (error) {
      logger.error('Error in DiecutService.saveBlade:', error);
      throw error;
    }
  }

  static async cancelTypeChange(bladeData) {
    try {
      const {
        diecutId, 
      diecutSN
      } = bladeData;

      logger.info(`Saving blade modification for: ${diecutSN}`);

      const updateSNQuery = `
        UPDATE KPDBA.DIECUT_MODIFY
        SET MODIFY_TYPE_APPV_FLAG = NULL
        WHERE DIECUT_SN = :diecut_sn
      `;
      // console.log(updateSNQuery)

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSN,
      });
 
      return {
        success: true,
        message: 'Blade data updated'
      };

    } catch (error) {
      logger.error('Error in DiecutService.saveBlade:', error);
      throw error;
    }
  }

  static async verifyApproverPOS(bladeData) {
    try {
      const {
        requiredPositionId
      } = bladeData;

      logger.info(`Saving blade modification for: ${requiredPositionId}`);

      const updateSNQuery = `
        UPDATE KPDBA.DIECUT_MODIFY
        SET MODIFY_TYPE_APPV_FLAG = :modifyTypeAppvFlag
        WHERE DIECUT_SN = :diecut_sn
      `;
      console.log(updateSNQuery)

      // await executeQuery(updateSNQuery, {
      //   diecut_sn: diecutSN,
      //   modifyTypeAppvFlag: modifyTypeAppvFlag
      // });
 
      return {
        success: true,
        message: 'Blade data updated'
      };

    } catch (error) {
      logger.error('Error in DiecutService.saveBlade:', error);
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

  static async saveDiecutSNList(diecutId, snList,diecut_TYPE,ORG_ID, EMP_ID,STATUS ) {
    try {
      logger.info(`Saving ${snList.length} SN entries for diecut ID: ${diecutId}`);
      // console.log(diecutId, snList);
      
      let savedCount = 0;
      let modifyCount = 0;
      let skippedCount = 0;
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split('T')[0];
      
      // Query to check if a diecut_sn already exists
      const checkSNQuery = `
        SELECT COUNT(*) AS COUNT
        FROM KPDBA.DIECUT_SN
        WHERE DIECUT_SN = :DIECUT_SN
      `;
      
      const insertSNQuery = `
        INSERT INTO KPDBA.DIECUT_SN
        (DIECUT_SN, DIECUT_ID, DIECUT_AGE,DIECUT_TYPE,CR_DATE,CR_USER_ID,CR_ORG_ID)
        VALUES (:DIECUT_SN, :DIECUT_ID ,0,:diecut_TYPE,SYSDATE,:EMP_ID, :ORG_ID)
      `;
      
      const insertModifyQuery = `
    INSERT INTO KPDBA.DIECUT_MODIFY
    (DIECUT_SN, START_TIME, MODIFY_TYPE, CR_DATE, CR_USER_ID, CR_ORG_ID)
    VALUES (:DIECUT_SN, TO_DATE('01/01/1900', 'MM/DD/YYYY'), 'N', SYSDATE, :EMP_ID, :ORG_ID)
`;

      
      for (const sn of snList) {
        if (!sn.DIECUT_SN) {
          logger.warn('Skipping entry with missing DIECUT_SN');
          continue;
        }
        
        // Check if diecut_sn already exists
        const checkResult = await executeQuery(checkSNQuery, 
          { DIECUT_SN: sn.DIECUT_SN }
        );
        
        // If the serial number already exists, skip it
        if (checkResult.rows && checkResult.rows[0] && checkResult.rows[0].COUNT > 0) {
          logger.warn(`Skipping duplicate DIECUT_SN: ${sn.DIECUT_SN}`);
          skippedCount++;
          continue;
        }
        
        // Insert the new serial number
        const result = await executeQuery(insertSNQuery,
          {
            DIECUT_SN: sn.DIECUT_SN,
            DIECUT_ID: diecutId,
            diecut_TYPE: diecut_TYPE,
            ORG_ID: ORG_ID, 
            EMP_ID: EMP_ID
          },
          { autoCommit: false });
        
        savedCount++;
        
        // if (sn.DIECUT_TYPE) {
          const result1 = await executeQuery(insertModifyQuery,
            {
              DIECUT_SN: sn.DIECUT_SN,
              ORG_ID: ORG_ID, 
              EMP_ID: EMP_ID
            },
            { autoCommit: false });
          modifyCount++;
        // }
      }
  
      // await executeQuery(
      //   `UPDATE KPDBA.DIECUT_STATUS
      //    SET LAST_MODIFY = :LAST_MODIFY
      //    WHERE DIECUT_ID = :DIECUT_ID`,
      //   {
      //     LAST_MODIFY: formattedDate,
      //     DIECUT_ID: diecutId
      //   },
      //   { autoCommit: false }
      // );
      
      return {
        savedCount,
        modifyCount,
        skippedCount
      };
    } catch (error) {
      logger.error('Error in DiecutService.saveDiecutSNList:', error);
      throw error;
    }
  }

  static async getStatusReport(filters = {}) {
    try {
      // console.log(filters)
      const sql = `
        SELECT DSN.DIECUT_ID, DSN.DIECUT_SN, DSN.AGES, DSN.USED, DSN.REMAIN, DSN.DIECUT_NEAR_EXP
        , CASE WHEN DSN.REMAIN <= 0 THEN '1' WHEN DSN.REMAIN <= DSN.DIECUT_NEAR_EXP THEN '2' ELSE '3' END PRIORITY
        , DSN.STATUS, DSN.DIECUT_TYPE, DSN.TL_STATUS, DSN.LAST_MODIFY, DSN.DUE_DATE, DM.MODIFY_TYPE ,TL.BLANK_SIZE_X, TL.BLANK_SIZE_Y
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
        LEFT JOIN (
    SELECT DIECUT_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG FROM KPDBA.DIECUT 
    UNION ALL
    SELECT BLANKING_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG  FROM KPDBA.BLANKING
    UNION ALL
    SELECT STRIPPING_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y AS BLANK_SIZE_Y, CANCEL_FLAG  FROM KPDBA.STRIPPING 
    UNION ALL
    SELECT PLATE_ID AS TOOLING_ID, PAPER_SIZE_X AS BLANK_SIZE_X, PAPER_SIZE_Y, CANCEL_FLAG  FROM KPDBA.PLATE
    UNION ALL
    SELECT BLANKET_UV_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG  FROM KPDBA.BLANKET_UV
    UNION ALL
    SELECT BLANKET_COAT_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG  FROM KPDBA.BLANKET_COAT
    UNION ALL
    SELECT PUMP_SWELL_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG  FROM KPDBA.PUMP_SWELL
    UNION ALL
    SELECT PUMP_K_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG  FROM KPDBA.PUMP_K
) TL ON DSN.DIECUT_ID = TL.TOOLING_ID
      `;

      let whereClause = '';
      const binds = {};
      
      // Add conditions to the inner query instead
      if (filters.diecutId) {
        whereClause += ' AND SN.DIECUT_ID = :diecutId';
        binds.diecutId = filters.diecutId;
      }
      
      if (filters.diecutType) {
        whereClause += ' AND SN.DIECUT_TYPE = :diecutType';
        binds.diecutType = filters.diecutType;
      }
      
      // Modify the main SQL query to include these conditions
      let finalSql = sql;
      
      if (whereClause) {
        // Insert the conditions into the innermost WHERE clause
        finalSql = sql.replace('WHERE NVL(SN.STATUS,\'F\') <> \'F\' AND SN.TL_STATUS = \'GOOD\'', 
                              `WHERE NVL(SN.STATUS,'F') <> 'F' AND SN.TL_STATUS = 'GOOD'${whereClause}`);
      }
      
      // Handle the priority filter separately since it uses the computed PRIORITY column
      if (filters.priority) {
        finalSql = `SELECT * FROM (${finalSql})`;
        binds.priority = filters.priority;
      }
      
      // finalSql += ' ORDER BY PRIORITY ASC, REMAIN ASC';
      console.log(finalSql)
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

   /**
   * Save diecut serial numbers and related modification info
   * @param {string} diecutId - The parent diecut ID
   * @param {Array} snList - Array of serial numbers and their types
   * @returns {Promise<Object>} - Results of the save operation
   */
   static async getDiecutSNList(diecutId) {
    try {
      logger.info(` SN entries for diecut ID: ${diecutId}`);
      // console.log(diecutId);
      
      
      const checkSNQuery = `
                
        SELECT 
    DS.DIECUT_ID,
    DS.DIECUT_SN,
    DS.DIECUT_AGE,
    DS.STATUS,
    DM.START_TIME,
    DM.END_TIME,
    DM.BLADE_TYPE,
    DM.MULTI_BLADE_REASON,
    DM.MULTI_BLADE_REMARK,
    DM.PROB_DESC,
    DM.REMARK,
    DM.MODIFY_TYPE
FROM 
    KPDBA.DIECUT_SN DS
LEFT JOIN 
    KPDBA.DIECUT_MODIFY DM ON DS.DIECUT_SN = DM.DIECUT_SN
WHERE 
    DS.DIECUT_ID = :s_diecut_id
ORDER BY 
    DS.DIECUT_SN ASC

      `;
      
      
      const checkResult = await executeQuery(checkSNQuery, 
        { s_diecut_id: diecutId }
      );
      // console.log(checkResult.rows)
  

      return {
        checkResult
      };
    } catch (error) {
      logger.error('Error in DiecutService.saveDiecutSNList:', error);
      throw error;
    }
  }

  static async getDiecutTypeList() {
    try {
      
      
      const checkSNQuery = `
                
        SELECT PTC_TYPE, PTC_DESC
FROM KPDBA.PTC_TYPE_MASTER

      `;
      
      
      const checkResult = await executeQuery(checkSNQuery
      );
      // console.log(checkResult.rows)
  

      return {
        checkResult
      };
    } catch (error) {
      logger.error('Error in DiecutService.saveDiecutSNList:', error);
      throw error;
    }
  }
}



module.exports = {
  Diecut,
  DiecutSN,
  DiecutStatus
};