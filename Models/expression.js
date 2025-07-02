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
                 WHEN EH.STATUS = 'P' THEN 'draft'
                 WHEN EH.STATUS = 'F' THEN 'deleted'
               END as expressionStatus
        FROM KPDBA.EXPRESSION_HEAD EH
        WHERE EH.EXP_ID = :expId
          AND (EH.CANCEL_FLAG IS NULL OR EH.CANCEL_FLAG != 'T')
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
                 WHEN EH.STATUS = 'P' THEN 'draft'
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
          AND CR_UID = :updateUid
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
        SET CANCEL_FLAG = 'T',
            CANCEL_DATE = SYSDATE,
            CANCEL_OID = :orgId,
            CANCEL_UID = :empId
        WHERE EXP_ID = :expId
          AND STATUS = 'P'
          AND CR_UID = :empId
          AND (CANCEL_FLAG IS NULL OR CANCEL_FLAG != 'T')
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
        EH.CR_UID,
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
          WHEN EH.STATUS = 'P' THEN 'draft'
          WHEN EH.STATUS = 'F' THEN 'deleted'
        END AS EXPRESSIONSTATUS,
        TO_CHAR(EH.EXP_DATE, 'YYYY-MM-DD') AS EXP_DATE_STR,
        EXTRACT(MONTH FROM EH.EXP_DATE) - 1 AS EXP_MONTH,
        EXTRACT(YEAR FROM EH.EXP_DATE) AS EXP_YEAR
      FROM KPDBA.EXPRESSION_HEAD EH
      WHERE EH.CR_UID = :empId
        AND (EH.CANCEL_FLAG IS NULL OR EH.CANCEL_FLAG != 'T')
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
   * @param {Object} attachmentData - Attachment data with structure:
   *   {
   *     fileId: string,
   *     fileName: string,
   *     originalName?: string,
   *     size?: number,
   *     mimeType?: string,
   *     url?: string (filepath from server)
   *   }
   * @param {string} orgId - Organization ID
   * @param {string} empId - Employee ID
   */
  static async addAttachment(expId, attachmentData, orgId, empId) {
    try {
      const getMaxSeqSql = `SELECT NVL(MAX(SEQ), 0) + 1 AS NEXT_SEQ FROM KPDBA.EXPRESSION_ATTACHMENT WHERE EXP_ID = :expId`;
      const maxSeqResult = await executeQuery(getMaxSeqSql, { expId });
      const nextSeq = maxSeqResult.rows[0].NEXT_SEQ;

      // Store both FILE_ID (from upload server) and filepath in STATUS field as JSON for additional metadata
      const metadata = {
        filepath: attachmentData.url,
        size: attachmentData.size,
        mimeType: attachmentData.mimeType,
        originalName: attachmentData.originalName || attachmentData.fileName
      };

      const sql = `
        INSERT INTO KPDBA.EXPRESSION_ATTACHMENT (
          EXP_ID, SEQ, FILE_ID, FILE_NAME, ATTACH_TYPE, SORT, STATUS, CR_DATE, CR_OID, CR_UID
        ) VALUES (
          :expId, :seq, :fileId, :fileName, :attachType, :sort, :status, SYSDATE, :orgId, :empId
        )
      `;

      await executeQuery(sql, {
        expId,
        seq: nextSeq,
        fileId: attachmentData.fileId,
        fileName: attachmentData.fileName,
        attachType: attachmentData.type || 'FILE',
        sort: nextSeq.toString().padStart(2, '0'),
        status: JSON.stringify(metadata), // Store metadata as JSON in STATUS field
        orgId,
        empId
      });

      logger.info(`Attachment added successfully: EXP_ID=${expId}, FILE_ID=${attachmentData.fileId}, FILE_NAME=${attachmentData.fileName}`);
    } catch (error) {
      logger.error("Error adding attachment:", error);
      throw error;
    }
  }

  /**
   * Get attachments for expression
   * @param {string} expId - Expression ID
   * @returns {Promise<Array>} - Array of attachments with parsed metadata
   */
  static async getAttachments(expId) {
    try {
      const sql = `
        SELECT EXP_ID, SEQ, FILE_ID, FILE_NAME, ATTACH_TYPE, SORT, STATUS, CR_DATE, CR_OID, CR_UID
        FROM KPDBA.EXPRESSION_ATTACHMENT
        WHERE EXP_ID = :expId
          AND (CANCEL_FLAG IS NULL OR CANCEL_FLAG != 'T')
        ORDER BY SEQ
      `;

      const result = await executeQuery(sql, { expId });
      
      // Parse metadata from STATUS field and transform for frontend
      return result.rows.map(attachment => {
        let metadata = {};
        
        // Try to parse STATUS as JSON metadata
        try {
          if (attachment.STATUS && attachment.STATUS !== 'T' && attachment.STATUS !== 'P' && attachment.STATUS !== 'F') {
            metadata = JSON.parse(attachment.STATUS);
          }
        } catch (e) {
          // If STATUS is not JSON, treat as simple status
          logger.warn(`Could not parse attachment metadata for ${attachment.FILE_ID}:`, e.message);
        }

        return {
          fileId: attachment.FILE_ID,
          fileName: attachment.FILE_NAME,
          type: attachment.ATTACH_TYPE,
          seq: attachment.SEQ,
          sort: attachment.SORT,
          // Include parsed metadata
          originalName: metadata.originalName || attachment.FILE_NAME,
          size: metadata.size,
          mimeType: metadata.mimeType,
          url: metadata.filepath, // filepath for download
          createdDate: attachment.CR_DATE,
          createdBy: attachment.CR_UID
        };
      });
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
        SET CANCEL_FLAG = 'T',
            CANCEL_DATE = SYSDATE
        WHERE EXP_ID = :expId
          AND (CANCEL_FLAG IS NULL OR CANCEL_FLAG != 'T')
      `;

      await executeQuery(sql, { expId });
    } catch (error) {
      logger.error("Error deleting attachments:", error);
      throw error;
    }
  }
}

module.exports = { Expression };