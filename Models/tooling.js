const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const { Diecut } = require('./diecut');

class Tooling {
  /**
   * Find all active toolings
   * @returns {Promise<Array>} - Array of tooling objects
   */
  static async findAll() {
    try {
      const sql = `
        SELECT t.*, d.DIECUT_NAME, d.DIECUT_TYPE, d.IMAGE_PATH 
        FROM KPDBA.TOOLING t
        LEFT JOIN KPDBA.DIECUT d ON t.DIECUT_ID = d.DIECUT_ID
        WHERE t.STATUS = 'ACTIVE'
      `;
      
      const result = await executeQuery(sql);
      return result.rows;
    } catch (error) {
      logger.error('Error finding toolings:', error);
      throw error;
    }
  }

  /**
   * Find a tooling by ID
   * @param {string} toolingId - Tooling ID
   * @returns {Promise<Object>} - Tooling object
   */
  static async findById(toolingId) {
    try {
      const sql = `
        SELECT t.*, d.DIECUT_NAME, d.DIECUT_TYPE, d.IMAGE_PATH 
        FROM KPDBA.TOOLING t
        LEFT JOIN KPDBA.DIECUT d ON t.DIECUT_ID = d.DIECUT_ID
        WHERE t.TOOLING_ID = :toolingId
        AND t.STATUS = 'ACTIVE'
      `;
      
      const result = await executeQuery(sql, { toolingId });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding tooling by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new tooling
   * @param {Object} toolingData - Tooling data
   * @returns {Promise<Object>} - Created tooling
   */
  static async create(toolingData) {
    try {
      // If diecutId is provided, check if it exists
      if (toolingData.diecutId) {
        const diecut = await Diecut.findById(toolingData.diecutId);
        if (!diecut) {
          throw new Error(`No diecut found with ID: ${toolingData.diecutId}`);
        }
      }
      
      const sql = `
        INSERT INTO KPDBA.TOOLING (
          TOOLING_ID, PROD_ID, REVISION, DIECUT_ID,
          DOC_TYPE, STATUS, CREATED_BY, UPDATED_BY,
          CREATED_AT, UPDATED_AT
        ) VALUES (
          :toolingId, :prodId, :revision, :diecutId,
          :docType, :status, :createdBy, :updatedBy,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
      
      await executeQuery(sql, {
        toolingId: toolingData.toolingId,
        prodId: toolingData.prodId,
        revision: toolingData.revision,
        diecutId: toolingData.diecutId || null,
        docType: toolingData.docType,
        status: toolingData.status || 'ACTIVE',
        createdBy: toolingData.createdBy,
        updatedBy: toolingData.updatedBy || toolingData.createdBy
      });
      
      // Create associated materials if any
      if (toolingData.materials && Array.isArray(toolingData.materials)) {
        for (const material of toolingData.materials) {
          await Material.create({
            ...material,
            prodId: toolingData.prodId,
            revision: toolingData.revision
          });
        }
      }
      
      // Return created tooling
      return await this.findById(toolingData.toolingId);
    } catch (error) {
      logger.error('Error creating tooling:', error);
      throw error;
    }
  }

  /**
   * Update a tooling
   * @param {string} toolingId - Tooling ID
   * @param {Object} toolingData - Tooling data to update
   * @returns {Promise<Object>} - Updated tooling
   */
  static async update(toolingId, toolingData) {
    try {
      // If diecutId is being updated, check if it exists
      if (toolingData.diecutId) {
        const diecut = await Diecut.findById(toolingData.diecutId);
        if (!diecut) {
          throw new Error(`No diecut found with ID: ${toolingData.diecutId}`);
        }
      }
      
      // Get existing tooling
      const existingTooling = await this.findById(toolingId);
      if (!existingTooling) {
        throw new Error(`No tooling found with ID: ${toolingId}`);
      }
      
      let updateFields = [];
      const binds = { toolingId };
      
      // Process fields for update
      Object.keys(toolingData).forEach(key => {
        if (key === 'toolingId' || key === 'materials') {
          // Skip ID field as it's used in WHERE clause
          // Skip materials as they're handled separately
          return;
        }
        
        const fieldName = key.replace(/([A-Z])/g, '_$1').toUpperCase();
        updateFields.push(`${fieldName} = :${key}`);
        binds[key] = toolingData[key];
      });
      
      // Always update UPDATED_AT
      updateFields.push('UPDATED_AT = CURRENT_TIMESTAMP');
      
      const sql = `
        UPDATE KPDBA.TOOLING
        SET ${updateFields.join(', ')}
        WHERE TOOLING_ID = :toolingId
      `;
      
      await executeQuery(sql, binds);
      
      // Handle materials if provided
      if (toolingData.materials && Array.isArray(toolingData.materials)) {
        // First, soft delete all existing materials for this product and revision
        await Material.deleteByProductAndRevision(
          existingTooling.PROD_ID,
          existingTooling.REVISION,
          toolingData.updatedBy
        );
        
        // Then create new materials
        for (const material of toolingData.materials) {
          await Material.create({
            ...material,
            prodId: existingTooling.PROD_ID,
            revision: existingTooling.REVISION
          });
        }
      }
      
      // Return updated tooling
      return await this.findById(toolingId);
    } catch (error) {
      logger.error('Error updating tooling:', error);
      throw error;
    }
  }

  /**
   * Soft delete a tooling
   * @param {string} toolingId - Tooling ID
   * @param {string} updatedBy - User ID who updated the record
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  static async delete(toolingId, updatedBy) {
    try {
      // Get existing tooling
      const existingTooling = await this.findById(toolingId);
      if (!existingTooling) {
        throw new Error(`No tooling found with ID: ${toolingId}`);
      }
      
      const sql = `
        UPDATE KPDBA.TOOLING
        SET STATUS = 'INACTIVE', UPDATED_BY = :updatedBy, UPDATED_AT = CURRENT_TIMESTAMP
        WHERE TOOLING_ID = :toolingId
      `;
      
      await executeQuery(sql, { toolingId, updatedBy });
      
      // Soft delete associated materials
      await Material.deleteByProductAndRevision(
        existingTooling.PROD_ID,
        existingTooling.REVISION,
        updatedBy
      );
      
      return true;
    } catch (error) {
      logger.error('Error deleting tooling:', error);
      throw error;
    }
  }
}

class Material {
  /**
   * Find materials by product ID and revision
   * @param {string} prodId - Product ID
   * @param {string} revision - Revision
   * @returns {Promise<Array>} - Array of material objects
   */
  static async findByProductAndRevision(prodId, revision) {
    try {
      const sql = `
        SELECT * FROM KPDBA.MATERIAL 
        WHERE PROD_ID = :prodId
        AND REVISION = :revision
        AND STATUS = 'ACTIVE'
      `;
      
      const result = await executeQuery(sql, { prodId, revision });
      return result.rows;
    } catch (error) {
      logger.error('Error finding materials:', error);
      throw error;
    }
  }

  /**
   * Create a new material
   * @param {Object} materialData - Material data
   * @returns {Promise<Object>} - Created material
   */
  static async create(materialData) {
    try {
      const sql = `
        INSERT INTO KPDBA.MATERIAL (
          MATERIAL_ID, PROD_ID, REVISION, MATERIAL_DESC,
          MATERIAL_TYPE, STATUS, CREATED_AT, UPDATED_AT
        ) VALUES (
          :materialId, :prodId, :revision, :materialDesc,
          :materialType, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
      
      await executeQuery(sql, {
        materialId: materialData.materialId,
        prodId: materialData.prodId,
        revision: materialData.revision,
        materialDesc: materialData.materialDesc || null,
        materialType: materialData.materialType,
        status: materialData.status || 'ACTIVE'
      });
      
      // Return created material
      return await this.findById(materialData.materialId);
    } catch (error) {
      logger.error('Error creating material:', error);
      throw error;
    }
  }

  /**
   * Find a material by ID
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} - Material object
   */
  static async findById(materialId) {
    try {
      const sql = `
        SELECT * FROM KPDBA.MATERIAL 
        WHERE MATERIAL_ID = :materialId
      `;
      
      const result = await executeQuery(sql, { materialId });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding material by ID:', error);
      throw error;
    }
  }
  
  /**
   * Soft delete materials by product ID and revision
   * @param {string} prodId - Product ID
   * @param {string} revision - Revision
   * @param {string} updatedBy - User ID who updated the record
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  static async deleteByProductAndRevision(prodId, revision, updatedBy) {
    try {
      const sql = `
        UPDATE KPDBA.MATERIAL
        SET STATUS = 'INACTIVE', UPDATED_AT = CURRENT_TIMESTAMP
        WHERE PROD_ID = :prodId
        AND REVISION = :revision
        AND STATUS = 'ACTIVE'
      `;
      
      await executeQuery(sql, { prodId, revision });
      return true;
    } catch (error) {
      logger.error('Error deleting materials:', error);
      throw error;
    }
  }
}

module.exports = {
  Tooling,
  Material
};