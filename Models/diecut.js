const { executeQuery } = require("../config/database");
const logger = require("../utils/logger");

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
      logger.error("Error finding diecuts:", error);
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
      logger.error("Error finding diecut by ID:", error);
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
      logger.error("Error finding diecut with serial numbers:", error);
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
        status: diecutData.status || "ACTIVE",
        createdBy: diecutData.createdBy,
        updatedBy: diecutData.updatedBy || diecutData.createdBy,
      });

      // Return created diecut
      return await this.findById(diecutData.diecutId);
    } catch (error) {
      logger.error("Error creating diecut:", error);
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
      Object.keys(diecutData).forEach((key) => {
        if (key === "diecutId") {
          // Skip ID field as it's used in WHERE clause
          return;
        }

        const fieldName = key.replace(/([A-Z])/g, "_$1").toUpperCase();
        updateFields.push(`${fieldName} = :${key}`);
        binds[key] = diecutData[key];
      });

      // Always update UPDATED_AT
      updateFields.push("UPDATED_AT = CURRENT_TIMESTAMP");

      const sql = `
        UPDATE KPDBA.DIECUT
        SET ${updateFields.join(", ")}
        WHERE DIECUT_ID = :diecutId
      `;

      await executeQuery(sql, binds);

      // Return updated diecut
      return await this.findById(diecutId);
    } catch (error) {
      logger.error("Error updating diecut:", error);
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
      logger.error("Error deleting diecut:", error);
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
        return "0";
      }

      return result.rows[0].MAX_SN.toString();
    } catch (error) {
      logger.error("Error getting max serial number:", error);
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
        status: snData.status || "ACTIVE",
      });

      // Return created serial number
      return await this.findById(snData.diecutSn);
    } catch (error) {
      logger.error("Error creating serial number:", error);
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
      logger.error("Error finding serial number by ID:", error);
      throw error;
    }
  }

  static async saveBlade(bladeData, ORG_ID, EMP_ID) {
    try {
      const {
        diecutId,
        diecutSN,
        diecutAge,
        startTime,
        endTime,
        bladeType,
        multiBladeReason,
        multiBladeRemark,
        probDesc,
        remark,
        status,
      } = bladeData;

      const formattedStartTime = startTime ? startTime.split("T")[0] : null;
      const formattedEndTime = endTime ? endTime.split("T")[0] : null;
      logger.info(`Saving blade modification for: ${diecutSN}`);

      // First, check if record exists in DIECUT_SN
      const checkSNQuery = `
        SELECT COUNT(*) AS count
        FROM KPDBA.DIECUT_SN
        WHERE DIECUT_SN = :diecut_sn
      `;

      const checkSNResult = await executeQuery(checkSNQuery, {
        diecut_sn: diecutSN,
      });

      const snExists = checkSNResult.rows[0].COUNT > 0;

      // If SN doesn't exist, insert it first
      if (!snExists) {
        // Check for existing records with the same diecutId to get the diecut_type
        const getTypeQuery = `
          SELECT DIECUT_TYPE 
          FROM KPDBA.DIECUT_SN 
          WHERE DIECUT_ID = :diecut_id 
          AND DIECUT_TYPE IS NOT NULL 
          ORDER BY DIECUT_SN DESC
        `;

        const typeResult = await executeQuery(getTypeQuery, {
          diecut_id: diecutId,
        });

        // Use the DIECUT_TYPE from existing records if available
        const diecutType =
          typeResult.rows.length > 0 ? typeResult.rows[0].DIECUT_TYPE : null;

        const insertSNQuery = `
          INSERT INTO KPDBA.DIECUT_SN (
            DIECUT_ID,
            DIECUT_SN,
            DIECUT_AGE,
            DIECUT_TYPE,
            STATUS,
            LAST_MODIFY,
            UP_DATE, 
            UP_ORG_ID,
            UP_USER_ID, 
            UP_DESC
          ) VALUES (
            :diecut_id,
            :diecut_sn,
            :diecut_age,
            :diecut_type,
            'N',
            SYSDATE,
            SYSDATE,
            :ORG_ID,
            :EMP_ID,
            'Update from web Tooling management'
          )
        `;

        await executeQuery(insertSNQuery, {
          diecut_id: diecutId,
          diecut_sn: diecutSN,
          diecut_age: diecutAge || 0,
          diecut_type: diecutType,
          ORG_ID: ORG_ID,
          EMP_ID: EMP_ID,
        });
      } else {
        // If SN exists, update it
        const updateSNQuery = `
          UPDATE KPDBA.DIECUT_SN
          SET DIECUT_AGE = :diecut_age,
          STATUS = :status,
          LAST_MODIFY = SYSDATE
          WHERE DIECUT_SN = :diecut_sn
        `;

        await executeQuery(updateSNQuery, {
          diecut_age: diecutAge || 0,
          diecut_sn: diecutSN,
          status: status,
        });
      }

      // Now check if record exists in DIECUT_MODIFY
      const checkExistingQuery = `
        SELECT COUNT(*) AS count
        FROM KPDBA.DIECUT_MODIFY
        WHERE DIECUT_SN = :diecut_sn
      `;

      const checkResult = await executeQuery(checkExistingQuery, {
        diecut_sn: diecutSN,
      });

      const recordExists = checkResult.rows[0].COUNT > 0;

      let modifyQuery;
      if (recordExists) {
        modifyQuery = `
          UPDATE KPDBA.DIECUT_MODIFY
          SET 
            START_TIME = TO_DATE(:start_time, 'YYYY-MM-DD'),
            END_TIME = ${endTime ? "TO_DATE(:end_time, 'YYYY-MM-DD')" : "NULL"},
            REMARK = :remark,
            MODIFY_TYPE = :status
          WHERE DIECUT_SN = :diecut_sn
        `;
      } else {
        modifyQuery = `
          INSERT INTO KPDBA.DIECUT_MODIFY (
            DIECUT_SN, 
            START_TIME, 
            END_TIME, 
            REMARK,
            MODIFY_TYPE,
            ORDER_DATE,
            ORDER_ORG_ID,
            ORDER_USER_ID
          ) VALUES (
            :diecut_sn,
            TO_DATE(:start_time, 'YYYY-MM-DD'),
            ${endTime ? "TO_DATE(:end_time, 'YYYY-MM-DD')" : "NULL"},
            :remark,
            :status,
            SYSDATE,
            :ORG_ID, 
            :EMP_ID
          )
        `;
      }

      const modifyParams = {
        diecut_sn: diecutSN,
        start_time: formattedStartTime || "1900-01-02",
        ...(endTime && { end_time: formattedEndTime }),
        remark: remark,
        status: status,
        EMP_ID: EMP_ID,
        ORG_ID: ORG_ID,
      };

      console.log(modifyQuery, modifyParams);

      const modifyResult = await executeQuery(modifyQuery, modifyParams);

      const getUpdatedDataQuery = `
        SELECT 
          DS.DIECUT_ID,
          DS.DIECUT_SN,
          DS.DIECUT_AGE,
          DS.STATUS,
          DS.DIECUT_TYPE,
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
        diecut_sn: diecutSN,
      });

      return {
        success: true,
        message: !snExists
          ? "New blade data created"
          : recordExists
          ? "Blade data updated"
          : "Blade data created",
        data: updatedData.rows[0],
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
      throw error;
    }
  }

  static async cancelOrder(bladeData) {
    try {
      const { diecutId, diecutSN, ORG_ID, EMP_ID } = bladeData;

      logger.info(`cancelOrder blade modification for: ${diecutSN}`);

      const updateModifyQuery = `
  UPDATE KPDBA.DIECUT_MODIFY
  SET CANCEL_FLAG = 'T',
      CANCEL_DATE = SYSDATE,
      CANCEL_ORG_ID = :orgId,
      CANCEL_USER_ID = :userId,
      MODIFY_TYPE = 'F'
  WHERE DIECUT_SN = :diecut_sn
`;

      await executeQuery(updateModifyQuery, {
        orgId: ORG_ID,
        userId: EMP_ID,
        diecut_sn: diecutSN,
      });

      // Then update DIECUT_SN table
      const updateSNQuery = `
  UPDATE KPDBA.DIECUT_SN
  SET STATUS = 'F',
      DUE_DATE = NULL,
      LAST_MODIFY = SYSDATE
  WHERE DIECUT_SN = :diecut_sn
`;

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSN,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
      throw error;
    }
  }

  static async updateJobInfo(bladeData) {
    try {
      const { diecutId, diecutSn, jobId, prodId, revision, prodDesc } =
        bladeData;

      logger.info(`cancelOrder blade modification for: ${diecutSn}`);

      // Then update DIECUT_SN table
      const updateSNQuery = `
  UPDATE KPDBA.DIECUT_SN
  SET JOB_ID = :jobId,
      PROD_ID = :prodId,
      REVISION = :revision
  WHERE DIECUT_SN = :diecut_sn
`;

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSn,
        jobId: jobId,
        prodId: prodId,
        revision: revision,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
      throw error;
    }
  }

  static async updateDate(bladeData) {
    try {
      const { diecutId, diecutSn, dueDate } = bladeData;

      const parsedDate = new Date(dueDate);

      const formattedDate = parsedDate.toISOString().split("T")[0];
      logger.info(`cancelOrder blade modification for: ${diecutSn}`);

      // Then update DIECUT_SN table
      const updateSNQuery = `
  UPDATE KPDBA.DIECUT_SN
  SET DUE_DATE = TO_DATE(:dueDate, 'YYYY-MM-DD')
  WHERE DIECUT_SN = :diecut_sn
`;

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSn,
        dueDate: formattedDate,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
      throw error;
    }
  }

  static async updateOrderDate(bladeData) {
    try {
      const { diecutId, diecutSn, orderDate, ORG_ID, EMP_ID } = bladeData;

      const parsedDate = new Date(orderDate);

      const formattedDate = parsedDate.toISOString().split("T")[0];
      logger.info(`cancelOrder blade modification for: ${diecutSn}`);

      // Then update DIECUT_SN table
      const updateSNQuery = `
UPDATE KPDBA.DIECUT_MODIFY
SET ORDER_DATE = TO_DATE(:dueDate || ' 12:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    ORDER_ORG_ID = :ORDER_ORG_ID,
    ORDER_USER_ID = :ORDER_USER_ID
WHERE DIECUT_SN = :diecut_sn
`;
      console.log(updateSNQuery, {
        diecut_sn: diecutSn,
        dueDate: formattedDate,
        ORDER_ORG_ID: ORG_ID,
        ORDER_USER_ID: EMP_ID,
      });

      const res = await executeQuery(updateSNQuery, {
        diecut_sn: diecutSn,
        dueDate: formattedDate,
        ORDER_ORG_ID: ORG_ID,
        ORDER_USER_ID: EMP_ID,
      });
      console.log(res);

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
      throw error;
    }
  }

  static async updateOrderInfo(bladeData) {
    try {
      const {
        diecutId,
        diecutSn,
        orderDate,
        ORG_ID,
        EMP_ID,
        jobId,
        prodDesc,
        prodId,
        REVISION,
        dueDate,
      } = bladeData;

      const parsedorderDate = orderDate.split(", ")[0].replace(/\//g, "-");
      const parsedDueDate = dueDate.split(", ")[0].replace(/\//g, "-");
      console.log(parsedorderDate, parsedDueDate);

      logger.info(`cancelOrder blade modification for: ${diecutSn}`);

      // Then update DIECUT_SN table
      const updateModiQuery = `
UPDATE KPDBA.DIECUT_MODIFY
SET ORDER_DATE = TO_DATE(:orderDate || ' 00:00:00', 'DD-MM-YYYY HH24:MI:SS'),
    ORDER_ORG_ID = :ORDER_ORG_ID,
    ORDER_USER_ID = :ORDER_USER_ID,
        UP_DATE = SYSDATE,
      UP_ORG_ID = :ORG_ID,
      UP_USER_ID = :EMP_ID
WHERE DIECUT_SN = :diecut_sn
`;
      console.log("save modi", updateModiQuery, {
        diecut_sn: diecutSn,
        orderDate: parsedorderDate,
        ORDER_ORG_ID: ORG_ID,
        ORDER_USER_ID: EMP_ID,
        ORG_ID: ORG_ID,
        EMP_ID: EMP_ID,
      });
      const resModi = await executeQuery(updateModiQuery, {
        diecut_sn: diecutSn,
        orderDate: parsedorderDate,
        ORDER_ORG_ID: ORG_ID,
        ORDER_USER_ID: EMP_ID,
        ORG_ID: ORG_ID,
        EMP_ID: EMP_ID,
      });

      if (resModi.rowsAffected === 0) {
        const insertModiQuery = `
INSERT INTO KPDBA.DIECUT_MODIFY (
  DIECUT_SN,
  START_TIME,
  ORDER_DATE,
  ORDER_ORG_ID,
  ORDER_USER_ID,
  CR_DATE,
  CR_ORG_ID,
  CR_USER_ID
) VALUES (
  :diecut_sn,
  TO_DATE('01-01-1900 00:00:00', 'DD-MM-YYYY HH24:MI:SS'),
  TO_DATE(:orderDateWithTime, 'DD-MM-YYYY HH24:MI:SS'),
  :ORDER_ORG_ID,
  :ORDER_USER_ID,
  SYSDATE,
  :ORG_ID,
  :EMP_ID
)
`;
        console.log(insertModiQuery, {
          diecut_sn: diecutSn,
          orderDateWithTime: parsedorderDate + " 00:00:00",
          ORDER_ORG_ID: ORG_ID,
          ORDER_USER_ID: EMP_ID,
          ORG_ID: ORG_ID,
          EMP_ID: EMP_ID,
        });
        await executeQuery(insertModiQuery, {
          diecut_sn: diecutSn,
          orderDateWithTime: parsedorderDate,
          ORDER_ORG_ID: ORG_ID,
          ORDER_USER_ID: EMP_ID,
          ORG_ID: ORG_ID,
          EMP_ID: EMP_ID,
        });
      }

      const updateSNQuery = `
UPDATE KPDBA.DIECUT_SN
SET DUE_DATE = TO_DATE(:dueDate || ' 00:00:00', 'DD-MM-YYYY HH24:MI:SS'),
JOB_ID = :jobId,
      PROD_ID = :prodId,
      REVISION = :REVISION,
      UP_DATE = SYSDATE,
      UP_ORG_ID = :ORG_ID,
      UP_USER_ID = :EMP_ID
WHERE DIECUT_SN = :diecut_sn
`;
      console.log(updateSNQuery, {
        diecut_sn: diecutSn,
        dueDate: parsedDueDate,
        jobId: jobId,
        prodId: prodId,
        REVISION: REVISION,
      });
      const resSN = await executeQuery(updateSNQuery, {
        diecut_sn: diecutSn,
        dueDate: parsedDueDate,
        jobId: jobId,
        prodId: prodId,
        REVISION: REVISION,
        EMP_ID: EMP_ID,
        ORG_ID: ORG_ID,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
      throw error;
    }
  }

  static async saveTypeChange(bladeData) {
    try {
      const {
        diecutId,
        diecutSN,
        modifyTypeAppvFlag,
        ORG_ID,
        EMP_ID,
        changeReason,
        modifyTypeBefore,
        modifyType,
      } = bladeData;

      logger.info(`Saving blade modification for: ${diecutSN}`);

      const updateSNQuery = `
        UPDATE KPDBA.DIECUT_MODIFY
        SET MODIFY_TYPE_APPV_FLAG = :modifyTypeAppvFlag,
        MODIFY_TYPE_REQ_REMARK = :MODIFY_TYPE_REQ_REMARK,
        MODIFY_TYPE_REQ_FROM = :modifyTypeBefore,
        MODIFY_TYPE_REQ_TO= :modifyType,
        MODIFY_TYPE_REQ_DATE = SYSDATE,
        MODIFY_TYPE_REQ_OID = :ORG_ID,
        MODIFY_TYPE_REQ_UID = :EMP_ID
        WHERE DIECUT_SN = :diecut_sn
      `;
      console.log(updateSNQuery);

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSN,
        modifyTypeAppvFlag: modifyTypeAppvFlag,
        MODIFY_TYPE_REQ_REMARK: changeReason,
        modifyTypeBefore: modifyTypeBefore,
        modifyType: modifyType,
        ORG_ID: ORG_ID,
        EMP_ID: EMP_ID,
      });

      return {
        success: true,
        message: "Blade data updated",
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
      throw error;
    }
  }

  static async approveTypeChange(bladeData) {
    try {
      const { diecutId, diecutSN, modifyType } = bladeData;

      logger.info(`Saving blade modification for: ${diecutSN}`);

      const updateMDQuery = `
        UPDATE KPDBA.DIECUT_MODIFY
        SET MODIFY_TYPE_APPV_FLAG = 'A' , MODIFY_TYPE = :modifyType
        WHERE DIECUT_SN = :diecut_sn
      `;

      await executeQuery(updateMDQuery, {
        diecut_sn: diecutSN,
        modifyType: modifyType,
      });

      const updateSNQuery = `
        UPDATE KPDBA.DIECUT_SN
        SET STATUS = :modifyType
        WHERE DIECUT_SN = :diecut_sn
      `;
      console.log(updateSNQuery);

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSN,
        modifyType: modifyType,
      });

      return {
        success: true,
        message: "Blade data updated",
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
      throw error;
    }
  }

  static async cancelTypeChange(bladeData) {
    try {
      const { diecutId, diecutSN } = bladeData;

      logger.info(`Canceling type change for: ${diecutSN}`);

      const updateSNQuery = `
      UPDATE KPDBA.DIECUT_MODIFY
      SET MODIFY_TYPE_APPV_FLAG = NULL,
      WHERE DIECUT_SN = :diecut_sn
    `;

      await executeQuery(updateSNQuery, {
        diecut_sn: diecutSN,
      });

      const selectedQuery = `
      SELECT MODIFY_TYPE FROM KPDBA.DIECUT_MODIFY
      WHERE DIECUT_SN = :diecut_sn
    `;

      const typedata = await executeQuery(selectedQuery, {
        diecut_sn: diecutSN,
      });

      console.log("Query result for", diecutSN, ":", typedata);

      // Safe handling of potentially null/undefined typedata
      let originalType = null;

      if (typedata && typedata.rows && typedata.rows.length > 0) {
        originalType = typedata.rows[0].MODIFY_TYPE || null;
      }

      return {
        success: true,
        message: "Type change cancelled successfully",
        data: {
          originalType: originalType,
          diecutSN: diecutSN,
          diecutId: diecutId,
        },
      };
    } catch (error) {
      logger.error("Error in DiecutService.cancelTypeChange:", error);
      throw error;
    }
  }
  static async verifyApproverPOS(bladeData) {
    try {
      const { requiredPositionId } = bladeData;

      logger.info(`Saving blade modification for: ${requiredPositionId}`);

      const updateSNQuery = `
        UPDATE KPDBA.DIECUT_MODIFY
        SET MODIFY_TYPE_APPV_FLAG = :modifyTypeAppvFlag
        WHERE DIECUT_SN = :diecut_sn
      `;
      console.log(updateSNQuery);

      // await executeQuery(updateSNQuery, {
      //   diecut_sn: diecutSN,
      //   modifyTypeAppvFlag: modifyTypeAppvFlag
      // });

      return {
        success: true,
        message: "Blade data updated",
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveBlade:", error);
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

  static async saveDiecutSNList(
    diecutId,
    snList,
    diecut_TYPE,
    ORG_ID,
    EMP_ID,
    STATUS
  ) {
    try {
      logger.info(
        `Saving ${snList.length} SN entries for diecut ID: ${diecutId}`
      );
      // console.log(diecutId, snList);

      let savedCount = 0;
      let modifyCount = 0;
      let skippedCount = 0;
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0];

      // Query to check if a diecut_sn already exists
      const checkSNQuery = `
        SELECT COUNT(*) AS COUNT
        FROM KPDBA.DIECUT_SN
        WHERE DIECUT_SN = :DIECUT_SN
      `;

      const insertSNQuery = `
        INSERT INTO KPDBA.DIECUT_SN
        (DIECUT_SN, DIECUT_ID, DIECUT_AGE,DIECUT_TYPE,CR_DATE,CR_USER_ID,CR_ORG_ID,STATUS)
        VALUES (:DIECUT_SN, :DIECUT_ID ,0,:diecut_TYPE,SYSDATE,:EMP_ID, :ORG_ID, :STATUS)
      `;

      const insertModifyQuery = `
    INSERT INTO KPDBA.DIECUT_MODIFY
    (DIECUT_SN, START_TIME, MODIFY_TYPE, CR_DATE, CR_USER_ID, CR_ORG_ID)
    VALUES (:DIECUT_SN, TO_DATE('01/01/1900', 'MM/DD/YYYY'), :MODIFY_TYPE , SYSDATE, :EMP_ID, :ORG_ID)
`;

      for (const sn of snList) {
        if (!sn.DIECUT_SN) {
          logger.warn("Skipping entry with missing DIECUT_SN");
          continue;
        }

        // Check if diecut_sn already exists
        const checkResult = await executeQuery(checkSNQuery, {
          DIECUT_SN: sn.DIECUT_SN,
        });

        // If the serial number already exists, skip it
        if (
          checkResult.rows &&
          checkResult.rows[0] &&
          checkResult.rows[0].COUNT > 0
        ) {
          logger.warn(`Skipping duplicate DIECUT_SN: ${sn.DIECUT_SN}`);
          skippedCount++;
          continue;
        }

        // Insert the new serial number
        const result = await executeQuery(
          insertSNQuery,
          {
            DIECUT_SN: sn.DIECUT_SN,
            DIECUT_ID: diecutId,
            diecut_TYPE: diecut_TYPE,
            ORG_ID: ORG_ID,
            EMP_ID: EMP_ID,
            STATUS: STATUS,
          },
          { autoCommit: false }
        );

        savedCount++;

        // if (sn.DIECUT_TYPE) {
        const result1 = await executeQuery(
          insertModifyQuery,
          {
            DIECUT_SN: sn.DIECUT_SN,
            ORG_ID: ORG_ID,
            EMP_ID: EMP_ID,
            MODIFY_TYPE: STATUS,
          },
          { autoCommit: false }
        );
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
        skippedCount,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async getStatusReport(filters = {}) {
    try {
      // console.log(filters)
      const sql = `
        SELECT DSN.DIECUT_ID, DSN.DIECUT_SN, DSN.AGES, DSN.USED, DSN.REMAIN, DSN.DIECUT_NEAR_EXP
        , CASE WHEN DSN.REMAIN <= 0 THEN '1' WHEN DSN.REMAIN <= DSN.DIECUT_NEAR_EXP THEN '2' ELSE '3' END PRIORITY
        , DSN.STATUS, DSN.DIECUT_TYPE, DSN.TL_STATUS, DSN.LAST_MODIFY, DSN.DUE_DATE, DM.MODIFY_TYPE
        , TL.BLANK_SIZE_X, TL.BLANK_SIZE_Y
        , DSN.JOB_ID, DSN.PROD_ID, DSN.REVISION
        , JB.JOB_DESC, PD.PROD_DESC , DM.ORDER_DATE
FROM (
    SELECT SN.DIECUT_ID, SN.DIECUT_SN, NVL(SN.DIECUT_AGE,0) AGES
        , CASE 
            WHEN NVL(SN.DIECUT_AGE,0) = 0 THEN 0
            WHEN NVL(UD.USED,0) = 0 THEN NVL(SN.DIECUT_AGE,0) 
            ELSE TRUNC(DIECUT_MAX)
            END AS DIECUT_NEAR_EXP
        , NVL(UD.USED,0) USED 
        , CASE 
            WHEN USED IS NULL THEN NVL(SN.DIECUT_AGE,0) 
            WHEN NVL(SN.DIECUT_AGE,0) - NVL(UD.USED,0) <0 THEN 0 
            ELSE NVL(SN.DIECUT_AGE,0) - NVL(UD.USED,0) 
          END REMAIN  
        , SN.STATUS, SN.TL_STATUS, SN.LAST_MODIFY, SN.DUE_DATE
        , SN.DIECUT_TYPE, SN.JOB_ID, SN.PROD_ID, SN.REVISION
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
    SELECT BLANKING_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG FROM KPDBA.BLANKING
    UNION ALL
    SELECT STRIPPING_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y AS BLANK_SIZE_Y, CANCEL_FLAG FROM KPDBA.STRIPPING 
    UNION ALL
    SELECT PLATE_ID AS TOOLING_ID, PAPER_SIZE_X AS BLANK_SIZE_X, PAPER_SIZE_Y, CANCEL_FLAG FROM KPDBA.PLATE
    UNION ALL
    SELECT BLANKET_UV_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG FROM KPDBA.BLANKET_UV
    UNION ALL
    SELECT BLANKET_COAT_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG FROM KPDBA.BLANKET_COAT
    UNION ALL
    SELECT PUMP_SWELL_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG FROM KPDBA.PUMP_SWELL
    UNION ALL
    SELECT PUMP_K_ID AS TOOLING_ID, BLANK_SIZE_X, BLANK_SIZE_Y, CANCEL_FLAG FROM KPDBA.PUMP_K
) TL ON DSN.DIECUT_ID = TL.TOOLING_ID
LEFT JOIN KPDBA.JOB JB ON DSN.JOB_ID = JB.JOB_ID
LEFT JOIN KPDBA.PRODUCT PD ON DSN.PROD_ID = PD.PROD_ID AND DSN.REVISION = PD.REVISION
      `;

      let whereClause = "";
      const binds = {};

      // Add conditions to the inner query instead
      if (filters.diecutId) {
        whereClause += " AND SN.DIECUT_ID = :diecutId";
        binds.diecutId = filters.diecutId;
      }

      if (filters.diecutType && filters.diecutType.length > 0) {
        // Check if it's an array with multiple values
        if (
          Array.isArray(filters.diecutType) &&
          filters.diecutType.length > 1
        ) {
          // Create a placeholder for each item in the array (e.g., ":diecutType0, :diecutType1")
          const placeholders = filters.diecutType
            .map((_, index) => `:diecutType${index}`)
            .join(", ");

          // Add the IN clause to the where condition
          whereClause += ` AND SN.DIECUT_TYPE IN (${placeholders})`;

          // Add each value to the binds object with its own placeholder name
          filters.diecutType.forEach((type, index) => {
            binds[`diecutType${index}`] = type;
          });
        } else {
          // Handle single value (either a string or an array with one element)
          whereClause += " AND SN.DIECUT_TYPE = :diecutType";
          binds.diecutType = Array.isArray(filters.diecutType)
            ? filters.diecutType[0]
            : filters.diecutType;
        }
      }

      // Modify the main SQL query to include these conditions
      let finalSql = sql;

      if (whereClause) {
        // Insert the conditions into the innermost WHERE clause
        finalSql = sql.replace(
          "WHERE NVL(SN.STATUS,'F') <> 'F' AND SN.TL_STATUS = 'GOOD'",
          `WHERE NVL(SN.STATUS,'F') <> 'F' AND SN.TL_STATUS = 'GOOD'${whereClause}`
        );
      }

      // Handle the priority filter separately since it uses the computed PRIORITY column
      if (filters.priority) {
        finalSql = `SELECT * FROM (${finalSql})`;
        binds.priority = filters.priority;
      }

      // finalSql += ' ORDER BY PRIORITY ASC, REMAIN ASC';
      console.log(finalSql);
      const result = await executeQuery(finalSql, binds);

      return result.rows;
    } catch (error) {
      logger.error("Error in DiecutStatus.getStatusReport:", error);
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
        priorities: {},
      };

      result.rows.forEach((row) => {
        summary.priorities[row.PRIORITY_DESCRIPTION.toLowerCase()] = parseInt(
          row.COUNT,
          10
        );
        summary.total += parseInt(row.COUNT, 10);
      });

      return summary;
    } catch (error) {
      logger.error("Error in DiecutStatus.getStatusSummary:", error);
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

      const checkResult = await executeQuery(checkSNQuery, {
        s_diecut_id: diecutId,
      });
      // console.log(checkResult.rows)

      return {
        checkResult,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async checkLocation(diecutSN) {
    try {
      logger.info(` SN entries for diecut ID: ${diecutSN}`);
      // console.log(diecutId);

      const checkSNQuery = `
        SELECT COUNT(*)  as count
FROM KPDBA.tl_stock_detail sd 
JOIN LOCATION_TL lt ON lt.LOC_ID = sd.LOC_ID 
WHERE sd.DIECUT_SN = :s_diecut_sn
      `;

      const checkResult = await executeQuery(checkSNQuery, {
        s_diecut_sn: diecutSN,
      });
      // console.log(checkResult.rows)

      return checkResult.rows[0].COUNT;
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async insertLocation(diecutSN, ORG_ID, EMP_ID) {
    try {
      logger.info(`Inserting location for diecut SN: ${diecutSN}`);

      // Get the next TRAN_ID by finding the max and adding 1
      const checkIDQuery = `
      SELECT MAX(CAST(TRAN_ID AS INT)) + 1 AS maxTranId
      FROM KPDBA.tl_stock_detail
    `;

      const IDResult = await executeQuery(checkIDQuery);
      const nextTranId = IDResult.rows[0]?.MAXTRANID;

      console.log(IDResult.rows[0].MAXTRANID);
      // Insert the location transaction
      const insertQuery = `
      INSERT INTO KPDBA.TL_STOCK_DETAIL (
        TRAN_ID, TRAN_SEQ, TRAN_TYPE, TRAN_DATE, 
        DIECUT_SN, QTY, COMP_ID, WAREHOUSE_ID, 
        LOC_ID, EMP_ID, STATUS, REMARK, 
        CR_DATE, CR_ORG_ID, CR_USER_ID
      )  VALUES (
        '${nextTranId.toString()}', ${1}, ${1}, SYSDATE,
        '${diecutSN}', ${1}, '${"001"}', '${"R"}',
        '${"RAP0003"}', '${EMP_ID}', '${"T"}', '${"รับเข้าคลังหลังการลงทะเบียน"}',
        SYSDATE, '${ORG_ID}', '${EMP_ID}'
      )
    `;

      // Set default values for required fields
      const params = [
        nextTranId.toString(), // TRAN_ID (as string)
        1, // TRAN_SEQ
        1, // TRAN_TYPE
        // TRAN_DATE is SYSDATE in the SQL
        diecutSN, // DIECUT_SN
        1, // QTY
        "001", // COMP_ID
        "R", // WAREHOUSE_ID
        "RAP0003", // LOC_ID
        EMP_ID, // EMP_ID
        "T", // STATUS
        "รับเข้าคลังหลังการลงทะเบียน", // REMARK
        // CR_DATE is SYSDATE in the SQL
        ORG_ID, // CR_ORG_ID
        EMP_ID, // CR_USER_ID
      ];
      console.log(insertQuery);
      const insertResult = await executeQuery(insertQuery);

      // After inserting the transaction, update the current location in the diecut master table

      return {
        success: true,
        message: "Location inserted successfully",
        data: {
          tranId: nextTranId.toString(),
          diecutSn: diecutSN,
          warehouseId: "TOOL",
          locId: "DFT",
        },
      };
    } catch (error) {
      logger.error("Error in DiecutService.insertLocation:", error);
      throw error;
    }
  }

  static async getBladeChangeCount(diecutId, diecutSN) {
    try {
      logger.info(` SN entries for diecut ID: ${diecutId}`);
      // console.log(diecutId);

      const checkSNQuery = `
                
        SELECT blade_change_count 
      FROM kpdba.diecut_sn 
      WHERE diecut_id = :diecutId AND diecut_sn = :diecutSN

      `;

      const checkResult = await executeQuery(checkSNQuery, {
        diecutId: diecutId,
        diecutSN: diecutSN,
      });
      // console.log(checkResult.rows)

      return {
        checkResult,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async getJobOrderList(diecutId, DIECUT_TYPE) {
    try {
      logger.info(` SN entries for diecut ID: ${diecutId}`);
      // console.log(diecutId);

      const checkSNQuery = `
                
      SELECT 'JS' AS SRC, JP.PTC_TYPE, JP.TOOLING_ID AS DIECUT_ID, JS.JOB_ID, JS.DATE_USING, JS.DATE_USING - 2 AS ORDER_DATE, JS.BRANCH_ID
FROM (
    SELECT JD.JOB_ID, MIN(CASE 
        WHEN SM.BRANCH_ID = 'RM3' AND TO_CHAR(JD.START_TIME, 'HH24') >= '07' THEN TRUNC(JD.START_TIME) 
        WHEN SM.BRANCH_ID = 'WG6' AND TO_CHAR(JD.START_TIME, 'HH24') >= '08' THEN TRUNC(JD.START_TIME) 
        ELSE 
            (TRUNC(JD.START_TIME) - 1) 
        END) - 2  DATE_USING, JD.MACH_ID, SM.BRANCH_ID
    FROM KPDBA.JS_PLAN_DETAIL JD
    JOIN KPDBA.JS_PLAN_SUBMIT SM ON JD.COMP_ID = SM.COMP_ID AND JD.ACT_DATE = SM.ACT_DATE AND JD.WDEPT_ID = SM.WDEPT_ID
    WHERE JD.STATUS = 'T' AND JD.POST_FLAG = 'T' AND JD.WDEPT_ID = 4 
    GROUP BY JD.JOB_ID, JD.MACH_ID, SM.BRANCH_ID
    HAVING MIN (CASE 
        WHEN SM.BRANCH_ID = 'RM3' AND TO_CHAR(JD.START_TIME, 'HH24') >= '07' THEN TRUNC(JD.START_TIME) 
        WHEN SM.BRANCH_ID = 'WG6' AND TO_CHAR(JD.START_TIME, 'HH24') >= '08' THEN TRUNC(JD.START_TIME) 
        ELSE (TRUNC(JD.START_TIME) - 1) 
        END) >=  TRUNC(SYSDATE)
) JS
JOIN (
    SELECT JOB_ID, DIECUT_ID AS TOOLING_ID, 'DC' PTC_TYPE FROM KPDBA.JOB_PLATE WHERE DIECUT_ID IS NOT NULL
    UNION ALL
    SELECT JOB_ID, BLANKING_ID AS TOOLING_ID, 'BD' PTC_TYPE FROM KPDBA.JOB_PLATE WHERE BLANKING_ID IS NOT NULL
    UNION ALL
    SELECT JOB_ID, STRIPPING_ID AS TOOLING_ID, 'ST' PTC_TYPE FROM KPDBA.JOB_PLATE WHERE STRIPPING_ID IS NOT NULL
) JP ON JS.JOB_ID = JP.JOB_ID 
  WHERE JP.TOOLING_ID = :diecutId AND JP.PTC_TYPE = :DIECUT_TYPE
UNION ALL 
SELECT 'LSD' AS SRC, PM.PTC_TYPE, JP.DIECUT_ID, JB.JOB_ID,  (JB.FIRST_DUE - NVL(DEPT_COUNT,0) + NVL(STAMP_SEQ, 0) ) - 1 AS DATE_USING, (JB.FIRST_DUE - NVL(DEPT_COUNT,0) + NVL(STAMP_SEQ - 2, 0) ) - 1 AS ORDER_DATE, PM.BRANCH_ID
FROM (
    SELECT JOB_ID, MIN(NVL(KPI_DATE, DUE_DATE)) FIRST_DUE 
    FROM KPDBA.JOB_ORDER_DUE 
    WHERE CURR_FLAG = 'T' AND WAIT_FLAG = 'F' 
    AND DUE_DATE > SYSDATE    
    GROUP BY JOB_ID
) JB
LEFT JOIN 
(
    SELECT JOB_ID, MAX(SEQ_RUN) AS DEPT_COUNT 
    FROM KPDBA.JOB_STEP 
    GROUP BY JOB_ID
) ST ON JB.JOB_ID = ST.JOB_ID 
LEFT JOIN (
    SELECT ST.JOB_ID, PT.PTC_TYPE, BRANCH_ID, MIN(ST.SEQ_RUN) AS STAMP_SEQ
    FROM KPDBA.JOB_STEP ST
    JOIN KPDBA.MASTER_JOB_STEP MS ON (ST.WDEPT_ID = MS.WDEPT_ID AND ST.STEP_ID = MS.STEP_ID AND MS.EQUIPMENT_TYPE IS NOT NULL)
    JOIN KPDBA.PTC_TYPE_MASTER PT ON (INSTR(MS.EQUIPMENT_TYPE, PT.PTC_TYPE)>0)
    GROUP BY ST.JOB_ID, PT.PTC_TYPE, BRANCH_ID
) PM ON JB.JOB_ID = PM.JOB_ID 
JOIN (
    SELECT JOB_ID, DIECUT_ID, 'DC' PTC_TYPE FROM KPDBA.JOB_PLATE WHERE DIECUT_ID IS NOT NULL
    UNION ALL
    SELECT JOB_ID, BLANKING_ID , 'BD' PTC_TYPE FROM KPDBA.JOB_PLATE WHERE BLANKING_ID IS NOT NULL
    UNION ALL
    SELECT JOB_ID, STRIPPING_ID AS TOOLING_ID, 'ST' PTC_TYPE FROM KPDBA.JOB_PLATE WHERE STRIPPING_ID IS NOT NULL
) JP ON PM.JOB_ID = JP.JOB_ID AND PM.PTC_TYPE = JP.PTC_TYPE
WHERE JP.DIECUT_ID = :diecutId AND JP.PTC_TYPE = :DIECUT_TYPE
ORDER BY DATE_USING ASC
      `;
      const checkResult = await executeQuery(checkSNQuery, {
        diecutId: diecutId,
        DIECUT_TYPE: DIECUT_TYPE,
      });

      if (checkResult.rows.length == 0) {
        return [];
      }
      // console.log(checkSNQuery)
      const jobIds = checkResult.rows.map((row) => row.JOB_ID);

      // Modify the job details query to get ALL jobs, not just the first one
      const jobsql = `
        SELECT jb.job_id, jb.job_desc, jd.prod_id, jd.revision, pd.prod_desc 
        FROM kpdba.job jb 
        JOIN kpdba.job_detail jd ON jb.job_id = jd.job_id
        JOIN kpdba.product pd ON jd.prod_id = pd.prod_id AND jd.revision = pd.revision
        WHERE jb.status = 'O' AND jd.job_id IN (${jobIds
          .map((id) => `'${id}'`)
          .join(",")})
      `;

      // Use parameterized query to prevent SQL injection
      // const jobres = await executeQuery(jobsql, { jobIds: jobIds });
      const jobres = await executeQuery(jobsql);

      // Combine the data
      const combinedLog = checkResult.rows.map((item1) => ({
        ...item1,
        ...(jobres.rows.find((item2) => item2.JOB_ID === item1.JOB_ID) || {}),
      }));

      // Return just the array instead of wrapping it in an object

      return {
        combinedLog,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async orderChange(
    diecutId,
    diecutSN,
    modifyType,
    problemDesc,
    dueDate
  ) {
    try {
      logger.info(` SN entries for diecut ID: ${diecutId}`);
      // console.log(diecutId);

      const updateQuery = `
        UPDATE kpdba.diecut_sn
        SET 
          status = :modifyType,
          prob_desc = :problemDesc
        WHERE diecut_id = :diecutId AND diecut_sn = :diecutSN
      `;

      await executeQuery(updateQuery, {
        modifyType,
        problemDesc: problemDesc || null,
        diecutId,
        diecutSN,
      });

      // If it's a blade change (B), increment the blade_change_count
      if (modifyType === "B") {
        const incrementQuery = `
          UPDATE kpdba.diecut_sn
          SET blade_change_count = NVL(blade_change_count, 0) + 1
          WHERE diecut_id = :diecutId AND diecut_sn = :diecutSN
        `;

        await executeQuery(incrementQuery, { diecutId, diecutSN });
      }

      // console.log(checkResult.rows)

      return true;
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async getDiecutSNDetail(diecutId, diecutSN) {
    try {
      logger.info(` SN entries for diecut ID: ${diecutId}`);

      const checkSNQuery = `
      SELECT 
        DS.DIECUT_ID,
        DS.DIECUT_SN,
        DS.DIECUT_AGE,
        DS.STATUS,
        DS.DIECUT_TYPE,
        DS.LAST_MODIFY,
        CASE 
            WHEN DM.START_TIME IS NOT NULL THEN 
                DM.START_TIME + INTERVAL '7' HOUR
            ELSE NULL 
        END AS START_TIME,
        CASE 
            WHEN DM.END_TIME IS NOT NULL THEN 
                DM.END_TIME + INTERVAL '7' HOUR
            ELSE NULL 
        END AS END_TIME,
        CASE 
            WHEN DM.BLADE_TYPE = 'M' THEN 'มีดคู่'
            WHEN DM.BLADE_TYPE = 'S' THEN 'มีดเดี่ยว'
            ELSE DM.BLADE_TYPE
        END AS BLADE_TYPE,
        COALESCE(MMBR.MBR_DESC, DM.MULTI_BLADE_REASON) AS MULTI_BLADE_REASON,
        DM.MULTI_BLADE_REMARK,
        DM.PROB_DESC,
        DM.REMARK,
        DM.MODIFY_TYPE,
        DM.MODIFY_TYPE_REQ_TO,
        DM.MODIFY_TYPE_APPV_FLAG,
        CASE 
            WHEN DM.CR_DATE IS NOT NULL THEN 
                DM.CR_DATE + INTERVAL '7' HOUR
            ELSE NULL 
        END AS CR_DATE,
        DM.MODIFY_TYPE_REQ_REMARK,
        DM.MODIFY_TYPE_REQ_FROM
      FROM 
        KPDBA.DIECUT_SN DS
      LEFT JOIN 
        KPDBA.DIECUT_MODIFY DM ON DS.DIECUT_SN = DM.DIECUT_SN
      LEFT JOIN 
        KPDBA.MASTER_MULTI_BLADE_REASON MMBR ON DM.MULTI_BLADE_REASON = MMBR.MBR_ID
      WHERE 
        DS.DIECUT_ID = :s_diecut_id
      AND DS.DIECUT_SN = :s_diecut_sn
      ORDER BY 
        DS.DIECUT_SN DESC
    `;

      const checkResult = await executeQuery(checkSNQuery, {
        s_diecut_id: diecutId,
        s_diecut_sn: diecutSN,
      });

      return {
        checkResult,
      };
    } catch (error) {
      logger.error("Error in DiecutService.getDiecutSNDetail:", error);
      throw error;
    }
  }

  static async getDiecutTypeList() {
    try {
      const checkSNQuery = `
                
        SELECT PTC_TYPE, PTC_DESC
FROM KPDBA.PTC_TYPE_MASTER

      `;

      const checkResult = await executeQuery(checkSNQuery);
      // console.log(checkResult.rows)

      return {
        checkResult,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async getDiecutInfos() {
    try {
      const checkSNQuery = `
         select TOPIC_TEXT from kpdba.profile where topic_name ='PROGRAM_INFO'
      `;

      const checkResult = await executeQuery(checkSNQuery);
      // console.log(checkResult.rows)

      return checkResult;
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async refreshStore() {
  try {
    const checkSNQuery = `CALL KPDBA.PACK_TOOLING.SP_CALC_PLANING_DATE(SYSDATE)`;
    
    const checkResult = await executeQuery(checkSNQuery);
    
    return checkResult;
  } catch (error) {
    logger.error("Error in DiecutService.getDiecutInfos:", error);
    throw error;
  }
}

  static async getDiecutAllowedtypes() {
    try {
      const checkSNQuery = `
      

SELECT p.TOPIC_TEXT FROM KPDBA.PROFILE p WHERE p.TOPIC_NAME = 'DIECUT_CHG_MOD_TYPE_LIST'

      `;

      const checkResult = await executeQuery(checkSNQuery);
      console.log(checkResult.rows);

      return {
        checkResult,
      };
    } catch (error) {
      logger.error("Error in DiecutService.saveDiecutSNList:", error);
      throw error;
    }
  }

  static async getDiecutOpenJobs(searchQuery = "") {
    try {
      let checkSNQuery = `
        SELECT jb.job_id, jb.job_desc, jd.prod_id, jd.revision, pd.prod_desc 
        FROM kpdba.job jb 
        JOIN kpdba.job_detail jd ON jb.job_id = jd.job_id
        JOIN kpdba.product pd ON jd.prod_id = pd.prod_id AND jd.revision = pd.revision
        WHERE jb.status = 'O'
      `;

      // Add search conditions if searchQuery is provided
      if (searchQuery && searchQuery.trim() !== "") {
        // Convert to uppercase if your database uses case-sensitive search
        const searchTerm = searchQuery.trim().toUpperCase();

        checkSNQuery += `
          AND (
            INSTR(UPPER(jb.job_id), UPPER('${searchTerm}')) > 0 OR 
            INSTR(UPPER(jb.job_desc), UPPER('${searchTerm}')) > 0 OR 
            INSTR(UPPER(jd.prod_id), UPPER('${searchTerm}')) > 0 OR 
            INSTR(UPPER(pd.prod_desc), UPPER('${searchTerm}')) > 0
          )
        `;
      }

      // Add order by clause
      checkSNQuery += ` ORDER BY jb.job_id DESC`;

      console.log(checkSNQuery);
      const checkResult = await executeQuery(checkSNQuery);

      return {
        checkResult,
      };
    } catch (error) {
      logger.error("Error in DiecutService.getDiecutOpenJobs:", error);
      throw error;
    }
  }

  static async getUserRole(empId, posId) {
    try {
      // Oracle-compatible query
      let checkQuery = `
        SELECT 'DIECUT_STAMPING_MANAGER_POS' AS role
        FROM KPDBA.profile
        WHERE topic_name = 'DIECUT_STAMPING_MANAGER_POS'
          AND (
            ',' || topic_text || ',' LIKE '%,' || :posId || ',%' OR 
            topic_text = :posId
          )
        UNION
        SELECT 'DIECUT_STAMPING_MANAGER_POS' AS role
        FROM KPDBA.profile
        WHERE topic_name = 'DIECUT_STAMPING_MANAGER_UID'
          AND (
            ',' || topic_text || ',' LIKE '%,' || :empId || ',%' OR 
            topic_text = :empId
          )
        UNION
        SELECT 'DIECUT_CHG_MOD_TYPE_APPV_POS' AS role
        FROM KPDBA.profile
        WHERE topic_name = 'DIECUT_CHG_MOD_TYPE_APPV_POS'
          AND (
            ',' || topic_text || ',' LIKE '%,' || :empId || ',%' OR 
            topic_text = :posId
          )
        UNION
        SELECT 'DIECUT_PLANNING_POS' AS role
        FROM KPDBA.profile
        WHERE topic_name = 'DIECUT_PLANNING_POS'
          AND (
            ',' || topic_text || ',' LIKE '%,' || :posId2 || ',%' OR 
            topic_text = :posId2
          )
      `;

      // Oracle named parameters
      const params = {
        posId: posId,
        empId: empId,
        posId2: posId, // Using different parameter name to avoid confusion
      };

      const checkResult = await executeQuery(checkQuery, params);
      console.log(checkQuery, params);
      console.log(checkResult.rows[0].ROLE);
      // If no role is found, return View as default
      if (checkResult && checkResult.rows.length === 0) {
        return {
          checkResult: [{ role: "VIEW", appvrole: false }],
        };
      }

      return {
        checkResult: [{ role: checkResult.rows[0].ROLE, appvrole: true }],
      };
    } catch (error) {
      logger.error("Error in DiecutService.getUserRole:", error);
      throw error;
    }
  }
}

module.exports = {
  Diecut,
  DiecutSN,
  DiecutStatus,
};
