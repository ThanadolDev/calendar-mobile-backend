const { Tooling, Material, Diecut } = require('../Models');
const { ApiError } = require('../middleware/error');
const { asyncHandler, formatResponse } = require('../utils/helpers');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

/**
 * Get all toolings
 * @route GET /api/toolings
 */
exports.getAllToolings = asyncHandler(async (req, res, next) => {
  const toolings = await Tooling.findAll({
    where: {
      status: 'ACTIVE'
    },
    include: [
      {
        model: Diecut,
        required: false
      }
    ]
  });

  res.status(200).json(formatResponse(
    true,
    'Toolings retrieved successfully',
    { toolings }
  ));
});

/**
 * Get tooling by ID
 * @route GET /api/toolings/:id
 */
exports.getTooling = asyncHandler(async (req, res, next) => {
  const tooling = await Tooling.findOne({
    where: {
      toolingId: req.params.id,
      status: 'ACTIVE'
    },
    include: [
      {
        model: Diecut,
        required: false
      }
    ]
  });

  if (!tooling) {
    return next(new ApiError(`No tooling found with ID: ${req.params.id}`, 404));
  }

  res.status(200).json(formatResponse(
    true,
    'Tooling retrieved successfully',
    { tooling }
  ));
});

/**
 * Create a new tooling
 * @route POST /api/toolings
 */
exports.createTooling = asyncHandler(async (req, res, next) => {
  // Start a transaction
  const transaction = await sequelize.transaction();

  try {
    // Check if diecut exists if diecutId is provided
    if (req.body.diecutId) {
      const diecut = await Diecut.findByPk(req.body.diecutId, { transaction });
      if (!diecut) {
        await transaction.rollback();
        return next(new ApiError(`No diecut found with ID: ${req.body.diecutId}`, 404));
      }
    }

    // Create tooling
    const tooling = await Tooling.create({
      ...req.body,
      createdBy: req.user.userId,
      status: 'ACTIVE'
    }, { transaction });

    // Create associated materials if any
    if (req.body.materials && Array.isArray(req.body.materials)) {
      for (const material of req.body.materials) {
        await Material.create({
          ...material,
          prodId: tooling.prodId,
          revision: tooling.revision,
          status: 'ACTIVE'
        }, { transaction });
      }
    }

    // Commit the transaction
    await transaction.commit();

    // Fetch the complete tooling with associations
    const createdTooling = await Tooling.findByPk(tooling.toolingId, {
      include: [
        {
          model: Diecut,
          required: false
        }
      ]
    });

    res.status(201).json(formatResponse(
      true,
      'Tooling created successfully',
      { tooling: createdTooling }
    ));
  } catch (error) {
    // Rollback transaction in case of error
    await transaction.rollback();
    logger.error('Error creating tooling:', error);
    return next(new ApiError('Failed to create tooling', 500));
  }
});

/**
 * Update a tooling
 * @route PUT /api/toolings/:id
 */
exports.updateTooling = asyncHandler(async (req, res, next) => {
  const tooling = await Tooling.findByPk(req.params.id);

  if (!tooling) {
    return next(new ApiError(`No tooling found with ID: ${req.params.id}`, 404));
  }

  // Start a transaction
  const transaction = await sequelize.transaction();

  try {
    // Check if diecut exists if diecutId is being updated
    if (req.body.diecutId && req.body.diecutId !== tooling.diecutId) {
      const diecut = await Diecut.findByPk(req.body.diecutId, { transaction });
      if (!diecut) {
        await transaction.rollback();
        return next(new ApiError(`No diecut found with ID: ${req.body.diecutId}`, 404));
      }
    }

    // Update tooling
    await tooling.update({
      ...req.body,
      updatedBy: req.user.userId
    }, { transaction });

    // Update or create materials if provided
    if (req.body.materials && Array.isArray(req.body.materials)) {
      // First, get all existing materials for this product and revision
      const existingMaterials = await Material.findAll({
        where: {
          prodId: tooling.prodId,
          revision: tooling.revision,
          status: 'ACTIVE'
        },
        transaction
      });

      // Create a map of existing materials by ID for easier lookup
      const existingMaterialMap = {};
      existingMaterials.forEach(mat => {
        existingMaterialMap[mat.materialId] = mat;
      });

      // Process each material in the request
      for (const material of req.body.materials) {
        if (material.materialId && existingMaterialMap[material.materialId]) {
          // Update existing material
          await existingMaterialMap[material.materialId].update({
            ...material,
            prodId: tooling.prodId,
            revision: tooling.revision
          }, { transaction });
          
          // Remove from map to track which ones are processed
          delete existingMaterialMap[material.materialId];
        } else {
          // Create new material
          await Material.create({
            ...material,
            prodId: tooling.prodId,
            revision: tooling.revision,
            status: 'ACTIVE'
          }, { transaction });
        }
      }

      // Mark remaining materials as inactive (soft delete)
      for (const materialId in existingMaterialMap) {
        await existingMaterialMap[materialId].update({
          status: 'INACTIVE'
        }, { transaction });
      }
    }

    // Commit the transaction
    await transaction.commit();

    // Fetch the updated tooling with associations
    const updatedTooling = await Tooling.findByPk(tooling.toolingId, {
      include: [
        {
          model: Diecut,
          required: false
        }
      ]
    });

    res.status(200).json(formatResponse(
      true,
      'Tooling updated successfully',
      { tooling: updatedTooling }
    ));
  } catch (error) {
    // Rollback transaction in case of error
    await transaction.rollback();
    logger.error('Error updating tooling:', error);
    return next(new ApiError('Failed to update tooling', 500));
  }
});

/**
 * Delete a tooling (soft delete)
 * @route DELETE /api/toolings/:id
 */
exports.deleteTooling = asyncHandler(async (req, res, next) => {
  const tooling = await Tooling.findByPk(req.params.id);

  if (!tooling) {
    return next(new ApiError(`No tooling found with ID: ${req.params.id}`, 404));
  }

  // Start a transaction
  const transaction = await sequelize.transaction();

  try {
    // Soft delete tooling
    await tooling.update({
      status: 'INACTIVE',
      updatedBy: req.user.userId
    }, { transaction });

    // Soft delete associated materials
    await Material.update(
      {
        status: 'INACTIVE'
      },
      {
        where: {
          prodId: tooling.prodId,
          revision: tooling.revision,
          status: 'ACTIVE'
        },
        transaction
      }
    );

    // Commit the transaction
    await transaction.commit();

    res.status(200).json(formatResponse(
      true,
      'Tooling deleted successfully',
      null
    ));
  } catch (error) {
    // Rollback transaction in case of error
    await transaction.rollback();
    logger.error('Error deleting tooling:', error);
    return next(new ApiError('Failed to delete tooling', 500));
  }
});

/**
 * Get materials by product ID and revision
 * @route GET /api/toolings/materials/:prodId/:revision
 */
exports.getMaterialsByProductAndRevision = asyncHandler(async (req, res, next) => {
  const { prodId, revision } = req.params;

  const materials = await Material.findAll({
    where: {
      prodId,
      revision,
      status: 'ACTIVE'
    }
  });

  res.status(200).json(formatResponse(
    true,
    'Materials retrieved successfully',
    { materials }
  ));
});