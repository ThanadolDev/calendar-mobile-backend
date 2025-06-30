const { executeQuery } = require("../config/database");
const logger = require("../utils/logger");

class Expression {
  /**
   * Create a new expression
   * @param {Object} expressionData - Expression data
   * @returns {Promise<Object>} - Created expression
   */
  static async create(expressionData) {
    try {
      // Get next EXP_ID
      const getMaxIdSql = `SELECT NVL(MAX(TO_NUMBER(EXP_ID)), 0) + 1 AS NEXT_ID FROM KPDBA.EXPRESSION_HEAD`;
      const maxIdResult = await executeQuery(getMaxIdSql);
      const nextId = maxIdResult.rows[0].NEXT_ID.toString();

      const sql = `
        INSERT INTO KPDBA.EXPRESSION_HEAD (
          EXP_ID, EXP_TYPE, EXP_KIND, EXP_DATE, EXP_TO, 
          EXP_SUBJECT, EXP_DETAIL, STATUS, CR_DATE, CR_OID, CR_UID
        ) VALUES (
          :expId, :expType, :expKind, SYSDATE, :expTo,
          :expSubject, :expDetail, :status, SYSDATE, :crOid, :crUid
        )
      `;

      await executeQuery(sql, {
        expId: nextId,
        expType: expressionData.expType,
        expKind: expressionData.expKind,
        expTo: expressionData.expTo,
        expSubject: expressionData.expSubject,
        expDetail: expressionData.expDetail,
        status: expressionData.status,
        crOid: expressionData.crOid,
        crUid: expressionData.crUid
      });

      // Handle attachments if any
      if (expressionData.attachments && expressionData.attachments.length > 0) {
        for (let attachment of expressionData.attachments) {
          await this.addAttachment(nextId, attachment, expressionData.crOid, expressionData.crUid);
        }
      }

      return await this.findById(nextId);
    } catch (error) {
      logger.error("Error creating expression:", error);
      throw error;
    }
  }

  /**
   * Find expression by ID
   * @param {string} expId - Expression ID
   * @returns {Promise<Object>} - Expression object
   */
  static async findById(expId) {
    try {
      const sql = `
        SELECT EH.*,
               CASE 
                 WHEN EH.EXP_TYPE = 'G' THEN 'praise'
                 WHEN EH.EXP_TYPE = 'B' THEN 'suggestion'
               END as type,
               CASE 
                 WHEN EH.EXP_KIND = 'X' THEN 'public'
                 WHEN EH.EXP_KIND = 'H' THEN 'private'
               END as privacy,
               CASE 
                 WHEN EH.STATUS = 'T' THEN 'published'
                 WHEN EH.STATUS = 'F' THEN 'draft'
               END as expressionStatus
        FROM KPDBA.EXPRESSION_HEAD EH
        WHERE EH.EXP_ID = :expId
      `;

      const result = await executeQuery(sql, { expId });
      
      if (result.rows.length === 0) {
        return null;
      }

      const expression = result.rows[0];
      
      // Get attachments
      expression.attachments = await this.getAttachments(expId);
      
      return expression;
    } catch (error) {
      logger.error("Error finding expression by ID:", error);
      throw error;
    }
  }

  /**
   * Find all expressions
   * @returns {Promise<Array>} - Array of expressions
   */
  static async findAll() {
    try {
      const sql = `
        SELECT EH.*,
               CASE 
                 WHEN EH.EXP_TYPE = 'G' THEN 'praise'
                 WHEN EH.EXP_TYPE = 'B' THEN 'suggestion'
               END as type,
               CASE 
                 WHEN EH.EXP_KIND = 'X' THEN 'public'
                 WHEN EH.EXP_KIND = 'H' THEN 'private'
               END as privacy,
               CASE 
                 WHEN EH.STATUS = 'T' THEN 'published'
                 WHEN EH.STATUS = 'F' THEN 'draft'
               END as expressionStatus
        FROM KPDBA.EXPRESSION_HEAD EH
        WHERE EH.STATUS = 'T'
        ORDER BY EH.EXP_DATE DESC
      `;

      const result = await executeQuery(sql);
      return result.rows;
    } catch (error) {
      logger.error("Error finding all expressions:", error);
      throw error;
    }
  }

  /**
   * Update expression
   * @param {string} expId - Expression ID
   * @param {Object} expressionData - Updated expression data
   * @returns {Promise<Object>} - Updated expression
   */
  static async update(expId, expressionData) {
    try {
      const sql = `
        UPDATE KPDBA.EXPRESSION_HEAD
        SET EXP_TYPE = :expType,
            EXP_KIND = :expKind,
            EXP_SUBJECT = :expSubject,
            EXP_DETAIL = :expDetail,
            STATUS = :status,
            UPDATE_DATE = SYSDATE,
            UPDATE_OID = :updateOid,
            UPDATE_UID = :updateUid
        WHERE EXP_ID = :expId
      `;

      const result = await executeQuery(sql, {
        expId,
        expType: expressionData.expType,
        expKind: expressionData.expKind,
        expSubject: expressionData.expSubject,
        expDetail: expressionData.expDetail,
        status: expressionData.status,
        updateOid: expressionData.updateOid,
        updateUid: expressionData.updateUid
      });

      if (result.rowsAffected === 0) {
        return null;
      }

      // Handle attachment updates if provided
      if (expressionData.attachments) {
        // Delete existing attachmentsf
        await this.deleteAttachments(expId);
        
        // Add new attachments
        for (let attachment of expressionData.attachments) {
          await this.addAttachment(expId, attachment, expressionData.updateOid, expressionData.updateUid);
        }
      }

      return await this.findById(expId);
    } catch (error) {
      logger.error("Error updating expression:", error);
      throw error;
    }
  }

  /**
   * Soft delete expression
   * @param {string} expId - Expression ID
   * @param {string} orgId - Organization ID
   * @param {string} empId - Employee ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(expId, orgId, empId) {
    try {
      const sql = `
        UPDATE KPDBA.EXPRESSION_HEAD
        SET STATUS = 'F',
            CANCEL_DATE = SYSDATE,
            CANCEL_OID = :orgId,
            CANCEL_UID = :empId
        WHERE EXP_ID = :expId
      `;

      const result = await executeQuery(sql, { expId, orgId, empId });
      return result.rowsAffected > 0;
    } catch (error) {
      logger.error("Error deleting expression:", error);
      throw error;
    }
  }

  /**
   * Get received expressions for a user
   * @param {string} empId - Employee ID
   * @param {Object} filters - Time period filters
   * @returns {Promise<Array>} - Array of received expressions
   */
static async getReceivedExpressions(empId, filters = {}) {
  try {
    let sql = `
      SELECT 
        EH.EXP_ID,
        EH.EXP_TO,
        EH.EXP_TYPE,
        EH.EXP_KIND,
        EH.EXP_DATE,
        EH.STATUS,
        EH.EXP_DETAIL,
        CASE 
          WHEN EH.EXP_TYPE = 'G' THEN 'praise'
          WHEN EH.EXP_TYPE = 'B' THEN 'suggestion'
        END AS TYPE,
        CASE 
          WHEN EH.EXP_KIND = 'X' THEN 1
          WHEN EH.EXP_KIND = 'H' THEN 0
        END AS ISPUBLIC,
        TO_CHAR(EH.EXP_DATE, 'YYYY-MM-DD') AS EXP_DATE_STR,
        TO_CHAR(EH.EXP_DATE, 'HH24:MI') AS EXP_TIME,
        EXTRACT(MONTH FROM EH.EXP_DATE)  AS EXP_MONTH,
        EXTRACT(YEAR FROM EH.EXP_DATE) AS EXP_YEAR
      FROM KPDBA.EXPRESSION_HEAD EH
      WHERE EH.EXP_TO = :empId
        AND EH.STATUS = 'T'
    `;

    const binds = { empId };

    // Add time period filters
    if (filters.timePeriod === 'monthly' && filters.year && filters.month !== undefined) {
      sql += `
        AND EXTRACT(YEAR FROM EH.EXP_DATE) = :year
        AND EXTRACT(MONTH FROM EH.EXP_DATE) = :month
      `;
      binds.year = filters.year;
      binds.month = parseInt(filters.month) + 1; // Convert 0-indexed to 1-indexed
    } else if (filters.timePeriod === 'yearly' && filters.year) {
      sql += `
        AND EXTRACT(YEAR FROM EH.EXP_DATE) = :year
      `;
      binds.year = filters.year;
    }

    sql += ` ORDER BY EH.EXP_DATE DESC`;

    const result = await executeQuery(sql, binds);

    // Get attachments for each expression
    for (let expression of result.rows) {
      expression.attachments = await this.getAttachments(expression.EXP_ID);
    }

    return result.rows;
  } catch (error) {
    logger.error("Error getting received expressions:", error);
    throw error;
  }
}

  /**
   * Get sent expressions for a user
   * @param {string} empId - Employee ID
   * @param {Object} filters - Time period filters
   * @returns {Promise<Array>} - Array of sent expressions
   */
static async getSentExpressions(empId, filters = {}) {
  try {
    let sql = `
      SELECT 
        EH.EXP_ID,
        EH.EXP_TO,
        EH.EXP_TYPE,
        EH.EXP_KIND,
        EH.EXP_DATE,
        EH.STATUS,
        EH.EXP_SUBJECT,
        EH.EXP_DETAIL,
        EH.CR_UID,
        CASE 
          WHEN EH.EXP_TYPE = 'G' THEN 'praise'
          WHEN EH.EXP_TYPE = 'B' THEN 'suggestion'
        END AS TYPE,
        CASE 
          WHEN EH.STATUS = 'T' THEN 'published'
          WHEN EH.STATUS = 'F' THEN 'draft'
        END AS EXPRESSIONSTATUS,
        TO_CHAR(EH.EXP_DATE, 'YYYY-MM-DD') AS EXP_DATE_STR,
        EXTRACT(MONTH FROM EH.EXP_DATE) - 1 AS EXP_MONTH,
        EXTRACT(YEAR FROM EH.EXP_DATE) AS EXP_YEAR
      FROM KPDBA.EXPRESSION_HEAD EH
      WHERE EH.CR_UID = :empId
    `;

    const binds = { empId };

    // Add time period filters
    if (filters.timePeriod === 'monthly' && filters.year && filters.month !== undefined) {
      sql += `
        AND EXTRACT(YEAR FROM EH.EXP_DATE) = :year
        AND EXTRACT(MONTH FROM EH.EXP_DATE) = :month
      `;
      binds.year = filters.year;
      binds.month = parseInt(filters.month) + 1; // Convert 0-based to 1-based month
    } else if (filters.timePeriod === 'yearly' && filters.year) {
      sql += `
        AND EXTRACT(YEAR FROM EH.EXP_DATE) = :year
      `;
      binds.year = filters.year;
    }

    sql += ` ORDER BY EH.EXP_DATE DESC`;

    const result = await executeQuery(sql, binds);

    // Get attachments for each expression
    for (let expression of result.rows) {
      expression.attachments = await this.getAttachments(expression.EXP_ID);
    }

    return result.rows;
  } catch (error) {
    logger.error("Error getting sent expressions:", error);
    throw error;
  }
}


  /**
   * Add attachment to expression
   * @param {string} expId - Expression ID
   * @param {Object} attachmentData - Attachment data
   * @param {string} orgId - Organization ID
   * @param {string} empId - Employee ID
   */
  static async addAttachment(expId, attachmentData, orgId, empId) {
    try {
      const getMaxSeqSql = `SELECT NVL(MAX(SEQ), 0) + 1 AS NEXT_SEQ FROM KPDBA.EXPRESSION_ATTACHMENT WHERE EXP_ID = :expId`;
      const maxSeqResult = await executeQuery(getMaxSeqSql, { expId });
      const nextSeq = maxSeqResult.rows[0].NEXT_SEQ;

      const sql = `
        INSERT INTO KPDBA.EXPRESSION_ATTACHMENT (
          EXP_ID, SEQ, FILE_ID, FILE_NAME, ATTACH_TYPE, STATUS, CR_DATE, CR_OID, CR_UID
        ) VALUES (
          :expId, :seq, :fileId, :fileName, :attachType, 'T', SYSDATE, :orgId, :empId
        )
      `;

      await executeQuery(sql, {
        expId,
        seq: nextSeq,
        fileId: attachmentData.fileId,
        fileName: attachmentData.fileName,
        attachType: attachmentData.type || 'FILE',
        orgId,
        empId
      });
    } catch (error) {
      logger.error("Error adding attachment:", error);
      throw error;
    }
  }

  /**
   * Get attachments for expression
   * @param {string} expId - Expression ID
   * @returns {Promise<Array>} - Array of attachments
   */
  static async getAttachments(expId) {
    try {
      const sql = `
        SELECT * FROM KPDBA.EXPRESSION_ATTACHMENT
        WHERE EXP_ID = :expId AND STATUS = 'T'
        ORDER BY SEQ
      `;

      const result = await executeQuery(sql, { expId });
      return result.rows;
    } catch (error) {
      logger.error("Error getting attachments:", error);
      throw error;
    }
  }

  /**
   * Delete attachments for expression
   * @param {string} expId - Expression ID
   */
  static async deleteAttachments(expId) {
    try {
      const sql = `
        UPDATE KPDBA.EXPRESSION_ATTACHMENT
        SET STATUS = 'F'
        WHERE EXP_ID = :expId
      `;

      await executeQuery(sql, { expId });
    } catch (error) {
      logger.error("Error deleting attachments:", error);
      throw error;
    }
  }
}

module.exports = { Expression };