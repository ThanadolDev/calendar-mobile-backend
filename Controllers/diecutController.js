const { Diecut, DiecutSN,DiecutStatus,  } = require('../Models');
const { ApiError } = require('../middleware/error');
const { asyncHandler, formatResponse, generateDiecutSN } = require('../utils/helpers');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

/**
 * Get all diecuts
 * @route GET /api/diecuts
 */
exports.getAllDiecuts = asyncHandler(async (req, res, next) => {
  const diecuts = await Diecut.findAll({
    where: {
      status: 'ACTIVE'
    }
  });

  res.status(200).json(formatResponse(
    true,
    'Diecuts retrieved successfully',
    { diecuts }
  ));
});

/**
 * Get a single diecut
 * @route GET /api/diecuts/:id
 */
// exports.getDiecut = asyncHandler(async (req, res, next) => {
//   const diecut = await Diecut.findOne({
//     where: {
//       diecutId: req.params.id,
//       status: 'ACTIVE'
//     },
//     include: [{
//       model: DiecutSN,
//       where: {
//         status: 'ACTIVE'
//       },
//       required: false
//     }]
//   });

//   if (!diecut) {
//     return next(new ApiError(`No diecut found with ID: ${req.params.id}`, 404));
//   }

//   res.status(200).json(formatResponse(
//     true,
//     'Diecut retrieved successfully',
//     { diecut }
//   ));
// });

/**
 * Create a new diecut
 * @route POST /api/diecuts
 */
exports.createDiecut = asyncHandler(async (req, res, next) => {
  // If image is uploaded, save it to the appropriate directory
  let imagePath = null;
  if (req.file) {
    const uploadDir = config.paths.diecutPath;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Generate file name based on diecut ID
    const fileName = `${req.body.diecutId}_${Date.now()}${path.extname(req.file.originalname)}`;
    imagePath = path.join(uploadDir, fileName);
    
    // Save file
    fs.writeFileSync(imagePath, req.file.buffer);
  }

  // Create diecut in database
  const diecut = await Diecut.create({
    ...req.body,
    imagePath,
    createdBy: req.user.userId,
    status: 'ACTIVE'
  });

  res.status(201).json(formatResponse(
    true,
    'Diecut created successfully',
    { diecut }
  ));
});

/**
 * Update a diecut
 * @route PUT /api/diecuts/:id
 */
exports.updateDiecut = asyncHandler(async (req, res, next) => {
  const diecut = await Diecut.findByPk(req.params.id);

  if (!diecut) {
    return next(new ApiError(`No diecut found with ID: ${req.params.id}`, 404));
  }

  // Handle image update if new file is provided
  if (req.file) {
    // Delete old image if it exists
    if (diecut.imagePath && fs.existsSync(diecut.imagePath)) {
      fs.unlinkSync(diecut.imagePath);
    }

    const uploadDir = config.paths.diecutPath;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Generate file name based on diecut ID
    const fileName = `${diecut.diecutId}_${Date.now()}${path.extname(req.file.originalname)}`;
    const imagePath = path.join(uploadDir, fileName);
    
    // Save file
    fs.writeFileSync(imagePath, req.file.buffer);
    
    // Update image path in request body
    req.body.imagePath = imagePath;
  }

  // Update diecut
  await diecut.update({
    ...req.body,
    updatedBy: req.user.userId
  });

  res.status(200).json(formatResponse(
    true,
    'Diecut updated successfully',
    { diecut }
  ));
});

/**
 * Delete a diecut (soft delete by setting status to 'INACTIVE')
 * @route DELETE /api/diecuts/:id
 */
exports.deleteDiecut = asyncHandler(async (req, res, next) => {
  const diecut = await Diecut.findByPk(req.params.id);

  if (!diecut) {
    return next(new ApiError(`No diecut found with ID: ${req.params.id}`, 404));
  }

  // Soft delete
  await diecut.update({
    status: 'INACTIVE',
    updatedBy: req.user.userId
  });

  res.status(200).json(formatResponse(
    true,
    'Diecut deleted successfully',
    null
  ));
});

/**
 * Generate a serial number for a diecut
 * @route POST /api/diecuts/:id/serial
 */
exports.generateSerialNumber = asyncHandler(async (req, res, next) => {
  const diecut = await Diecut.findByPk(req.params.id);

  if (!diecut) {
    return next(new ApiError(`No diecut found with ID: ${req.params.id}`, 404));
  }

  const maxSN = await DiecutSN.getMaxSerialNumber(diecut.diecutId);
  
  const newSN = generateDiecutSN(diecut.diecutId, maxSN);
  
  // Save new serial number to database
  const diecutSN = await DiecutSN.create({
    diecutSn: newSN,
    diecutId: diecut.diecutId,
    diecutType: diecut.diecutType,
    diecutAge: req.body.diecutAge || 0,
    status: 'ACTIVE'
  });

  res.status(201).json(formatResponse(
    true,
    'Serial number generated successfully',
    { diecutSN }
  ));
});

exports.saveDiecutSN = async (req, res, next) => {
  try {
    // Validate request body
    const { diecutId, SNList } = req.body;
    
    if (!diecutId || !SNList || !Array.isArray(SNList) || SNList.length === 0) {
      return next(new ApiError('Invalid request body. Required: diecutId and non-empty SNList array', 400));
    }
    
    // Log request for debugging
    logger.info(`Saving diecut SN list for: ${diecutId}, count: ${SNList.length}`);
    
    // Call service function to handle database operations
    const result = await DiecutStatus.saveDiecutSNList(diecutId, SNList);
    
    // Return success response
    res.status(200).json(formatResponse(
      true,
      'Diecut SN list saved successfully',
      { 
        result
      }
    ));
  } catch (error) {
    logger.error('Error saving diecut SN list', error);
    return next(new ApiError('Failed to save diecut SN list', 500));
  }
}

exports.getDiecutSN = async (req, res, next) => {
  try {
    // Validate request body
    const { diecutId } = req.body;
    
    if (!diecutId ) {
      return next(new ApiError('Invalid request body. Required: diecutId ', 400));
    }
    
    // Log request for debugging
    logger.info(`Find diecut SN list for: ${diecutId}`);
    
    // Call service function to handle database operations
    const result = await DiecutStatus.getDiecutSNList(diecutId);
    
    // Return success response
    res.status(200).json(formatResponse(
      true,
      'Diecut SN list saved successfully',
      { 
        diecutId,
        diecutList: result.checkResult.rows
      }
    ));
  } catch (error) {
    logger.error('Error saving diecut SN list', error);
    return next(new ApiError('Failed to save diecut SN list', 500));
  }
}

exports.saveDiecutModiSN = async (req, res, next) => {
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
      remark 
    } = req.body;
    
    if (!diecutId || !diecutSN) {
      return next(new ApiError('Invalid request body. Required: diecutId and diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSN}`);
    
    const result = await DiecutSN.saveBlade({
      diecutId,
      diecutSN,
      diecutAge,
      startTime,
      endTime,
      bladeType,
      multiBladeReason,
      multiBladeRemark,
      probDesc,
      remark
    });
    
    res.status(200).json(formatResponse(
      true,
      'Blade modification saved successfully',
      { 
        diecutSN,
        result: result
      }
    ));
  } catch (error) {
    logger.error('Error saving blade modification', error);
    return next(new ApiError('Failed to save blade modification', 500));
  }
}

exports.getDiecuttypes = async (req, res, next) => {
  try {
    
    const result = await DiecutStatus.getDiecutTypeList();
    
    // Return success response
    res.status(200).json(formatResponse(
      true,
      'Diecut Type list successfully',
      { 
        diecutType: result.checkResult.rows
      }
    ));
  } catch (error) {
    logger.error('Error saving diecut SN list', error);
    return next(new ApiError('Failed to save diecut SN list', 500));
  }
}

exports.getDiecutStatusReport = asyncHandler(async (req, res, next) => {
  try {
    // Extract filters from query parame
    // ters
    const filters = {
      diecutId: req.query.diecutId,
      diecutType: req.query.diecutType,
      priority: req.query.priority
    };
    
    // Get data from the model
    const diecuts = await DiecutStatus.getStatusReport(filters);
    
    // Format the response
    res.status(200).json(formatResponse(
      true,
      'Diecut status report retrieved successfully',
      { 
        count: diecuts.length,
        diecuts: diecuts
      }
    ));
  } catch (error) {
    logger.error('Error retrieving diecut status report:', error);
    return next(new ApiError('Failed to retrieve diecut status report', 500));
  }
});


exports.getDiecutStatusSummary = asyncHandler(async (req, res, next) => {
  try {
    // Get summary data from the model
    const summary = await DiecutStatus.getStatusSummary();
    
    // Format the response
    res.status(200).json(formatResponse(
      true,
      'Diecut status summary retrieved successfully',
      { summary }
    ));
  } catch (error) {
    logger.error('Error retrieving diecut status summary:', error);
    return next(new ApiError('Failed to retrieve diecut status summary', 500));
  }
});