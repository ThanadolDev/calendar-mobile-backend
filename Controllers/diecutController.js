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
    const { diecutId, SNList,diecut_TYPE,STATUS } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    console.log(ORG_ID, EMP_ID)
    
    if (!diecutId || !SNList || !Array.isArray(SNList) || SNList.length === 0) {
      return next(new ApiError('Invalid request body. Required: diecutId and non-empty SNList array', 400));
    }
    
    // Log request for debugging
    logger.info(`Saving diecut SN list for: ${diecutId}, count: ${SNList.length}`);
    
    // Call service function to handle database operations
    const result = await DiecutStatus.saveDiecutSNList(diecutId, SNList,diecut_TYPE,ORG_ID, EMP_ID,STATUS );
    
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



exports.getDiecutSNDetail = async (req, res, next) => {
  try {
    // Validate request body
    const { diecutId,diecutSN } = req.body;
    
    if (!diecutId ) {
      return next(new ApiError('Invalid request body. Required: diecutId ', 400));
    }
    
    // Log request for debugging
    logger.info(`Find diecut SN list for: ${diecutId}`);
    
    // Call service function to handle database operations
    const result = await DiecutStatus.getDiecutSNDetail(diecutId,diecutSN);
    
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

exports.getBladeChangeCount = async (req, res, next) => {
  try {
    // Validate request body
    const { diecutId,diecutSN } = req.body;
    
    if (!diecutId ) {
      return next(new ApiError('Invalid request body. Required: diecutId ', 400));
    }
    
    // Log request for debugging
    logger.info(`Find diecut SN list for: ${diecutId}`);
    
    // Call service function to handle database operations
    const result = await DiecutStatus.getBladeChangeCount(diecutId,diecutSN);
    
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

exports.getJobOrderList = async (req, res, next) => {
  try {
    // Validate request body
    const { diecutId, DIECUT_TYPE } = req.body;
    
    if (!diecutId ) {
      return next(new ApiError('Invalid request body. Required: diecutId ', 400));
    }
    
    // Log request for debugging
    logger.info(`Find diecut SN list for: ${diecutId}`);
    
    // Call service function to handle database operations
    const result = await DiecutStatus.getJobOrderList(diecutId,DIECUT_TYPE);
    
    // Return success response
    res.status(200).json(formatResponse(
      true,
      'Diecut SN list saved successfully',
      { 
        diecutId,
        jobList: result.combinedLog
      }
    ));
  } catch (error) {
    logger.error('Error saving diecut SN list', error);
    return next(new ApiError('Failed to save diecut SN list', 500));
  }
}

exports.orderChange = async (req, res, next) => {
  try {
    // Validate request body
    const { diecutId, diecutSN, modifyType, problemDesc, dueDate } = req.body;

    if (!diecutId || !diecutSN || !modifyType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: diecutId, diecutSN, or modifyType'
      });
    }
    
    // For type E (repair), problem description is required
    if (modifyType === 'E' && !problemDesc) {
      return res.status(400).json({
        success: false,
        message: 'Problem description is required for repair (E) type'
      });
    }
    if (!diecutId ) {
      return next(new ApiError('Invalid request body. Required: diecutId ', 400));
    }
    
    // Log request for debugging
    logger.info(`Find diecut SN list for: ${diecutId}`);
    
    // Call service function to handle database operations
    const result = await DiecutStatus.orderChange(diecutId,diecutSN, modifyType, problemDesc, dueDate);
    
    // Return success response
    res.status(200).json(formatResponse(
      true,
      'Diecut saved successfully'
    ));
  } catch (error) {
    logger.error('Error saving diecut SN list', error);
    return next(new ApiError('Failed to save diecut SN list', 500));
  }
}

exports.saveDiecutModiSN = async (req, res, next) => {
  try {
    const data = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    // Check if input is an array or single object
    const isArray = Array.isArray(data);
    const dataArray = isArray ? data : [data];
    
    // Validate input data
    for (const item of dataArray) {
      const { diecutId, diecutSN } = item;
      if (!diecutId || !diecutSN) {
        return next(new ApiError('Invalid request body. Required: diecutId and diecutSN for each item', 400));
      }
    }
    
    logger.info(`Saving blade modification for ${dataArray.length} items`);
    
    // Process each item and collect results
    const results = [];
    for (const item of dataArray) {
      const result = await DiecutSN.saveBlade(item);
      results.push({
        diecutSN: item.diecutSN,
        result: result
      });
    }
    
    res.status(200).json(formatResponse(
      true,
      `Blade modification${dataArray.length > 1 ? 's' : ''} saved successfully`,
      { results }
    ));
  } catch (error) {
    logger.error('Error saving blade modification', error);
    return next(new ApiError('Failed to save blade modification', 500));
  }
}

exports.updateJobInfo = async (req, res, next) => {
  try {
    const { 
      diecutId, 
      diecutSn, 
      jobId,
      prodId,
      revision,
      prodDesc,
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!req.body.diecutSn) {
      console.log(req.body)
      return next(new ApiError('Invalid request body. Required:  diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSn}`);
    
    const result = await DiecutSN.updateJobInfo({
      diecutId,
      diecutSn,
      jobId,
      prodId,
      revision,
      prodDesc,
    });
    
    res.status(200).json(formatResponse(
      true,
      'Blade modification saved successfully',
      { 
        diecutSn,
        result: result
      }
    ));
  } catch (error) {
    logger.error('Error saving blade modification', error);
    return next(new ApiError('Failed to save blade modification', 500));
  }
}

exports.updatedate = async (req, res, next) => {
  try {
    const { 
      diecutId, 
      diecutSn, 
      dueDate
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!req.body.diecutSn) {
      console.log(req.body)
      return next(new ApiError('Invalid request body. Required:  diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSn}`);
    
    const result = await DiecutSN.updateDate({
      diecutId,
      diecutSn,
      dueDate
    });
    
    res.status(200).json(formatResponse(
      true,
      'Blade modification saved successfully',
      { 
        diecutSn,
        result: result
      }
    ));
  } catch (error) {
    logger.error('Error saving blade modification', error);
    return next(new ApiError('Failed to save blade modification', 500));
  }
}

exports.updateorderdate = async (req, res, next) => {
  try {
    const { 
      diecutId, 
      diecutSn, 
      orderDate
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!req.body.diecutSn) {
      console.log(req.body)
      return next(new ApiError('Invalid request body. Required:  diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSn}`);
    
    const result = await DiecutSN.updateOrderDate({
      diecutId,
      diecutSn,
      orderDate,ORG_ID, EMP_ID
    });
    
    res.status(200).json(formatResponse(
      true,
      'Blade modification saved successfully',
      { 
        diecutSn,
        result: result
      }
    ));
  } catch (error) {
    logger.error('Error saving blade modification', error);
    return next(new ApiError('Failed to save blade modification', 500));
  }
}

exports.updateOrderInfo = async (req, res, next) => {
  try {
    const { 
      diecutId, 
      diecutSn, 
      orderDate,
      dueDate,
      jobId,
      prodDesc,
      prodId,
      REVISION
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!req.body.diecutSn) {
      console.log(req.body)
      return next(new ApiError('Invalid request body. Required:  diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSn}`);
    
    const result = await DiecutSN.updateOrderInfo({
      diecutId,
      diecutSn,
      orderDate,dueDate,ORG_ID, EMP_ID,
      jobId,
      prodDesc,
      prodId,
      REVISION
    });
    
    res.status(200).json(formatResponse(
      true,
      'Blade modification saved successfully',
      { 
        diecutSn,
        result: result
      }
    ));
  } catch (error) {
    logger.error('Error saving blade modification', error);
    return next(new ApiError('Failed to save blade modification', 500));
  }
}

exports.cancelOrder = async (req, res, next) => {
  try {
    const { 
      diecutId, 
      diecutSN,
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!diecutId || !diecutSN) {
      return next(new ApiError('Invalid request body. Required: diecutId and diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSN}`);
    
    const result = await DiecutSN.cancelOrder({
      diecutId,
      diecutSN,ORG_ID, EMP_ID 
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

exports.saveTypeRequest = async (req, res, next) => {
  try {
    const { 
      diecutId, 
      diecutSN,
      modifyTypeAppvFlag 
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!diecutId || !diecutSN) {
      return next(new ApiError('Invalid request body. Required: diecutId and diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSN}+ ${modifyTypeAppvFlag}`);
    
    const result = await DiecutSN.saveTypeChange({
      diecutId,
      diecutSN,
      modifyTypeAppvFlag,  ORG_ID, EMP_ID
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

exports.verifyApprover = async (req, res, next) => {
  try {
    const { 
      username, 
      password,
      requiredPositionId 
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!username || !password) {
      return next(new ApiError('Invalid request body. Required: username and password', 400));
    }
    
    logger.info(`Saving blade modification for: ${username}`);
    
    // const result = await DiecutSN.verifyApproverPOS({
    //   requiredPositionId
    // });
    
    res.status(200).json(formatResponse(
      true,
      'Blade modification saved successfully',
      { 
        username,
      }
    ));
  } catch (error) {
    logger.error('Error saving blade modification', error);
    return next(new ApiError('Failed to save blade modification', 500));
  }
}

exports.approveTypeChange = async (req, res, next) => {
  try {
    const { 
      diecutId, 
      diecutSN,
      modifyType,
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!diecutId || !diecutSN) {
      return next(new ApiError('Invalid request body. Required: diecutId and diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSN}+ ${modifyType}`);
    
    const result = await DiecutSN.approveTypeChange({
      diecutId,
      diecutSN,
      modifyType
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

exports.cancelTypeChange = async (req, res, next) => {
  try {
    const { 
      diecutId, 
      diecutSN,
    } = req.body;
    const { ORG_ID, EMP_ID } = req.user;
    
    if (!diecutId || !diecutSN) {
      return next(new ApiError('Invalid request body. Required: diecutId and diecutSN', 400));
    }
    
    logger.info(`Saving blade modification for: ${diecutSN}`);
    
    const result = await DiecutSN.cancelTypeChange({
      diecutId,
      diecutSN,
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

exports.getDiecutOpenJobs = async (req, res, next) => {
  try {
    // Extract search query from request body
    const { searchQuery } = req.body;
    
    // Pass searchQuery to service method
    const result = await DiecutStatus.getDiecutOpenJobs(searchQuery);
    
    // Return success response
    res.status(200).json(formatResponse(
      true,
      'Diecut Type list successfully',
      { 
        diecutType: result.checkResult.rows
      }
    ));
  } catch (error) {
    logger.error('Error fetching open job orders', error);
    return next(new ApiError('Failed to fetch open job orders', 500));
  }
}

exports.getUserRole = async (req, res, next) => {
  try {
    // Extract search query from request body
    const { empId, posId } = req.body;
    
    // Pass searchQuery to service method
    const result = await DiecutStatus.getUserRole(empId, posId);
    
    // Return success response
    res.status(200).json(formatResponse(
      true,
      'get role successfully',
      { 
        roles: result.checkResult.rows
      }
    ));
  } catch (error) {
    logger.error('Error fetching open job orders', error);
    return next(new ApiError('Failed to fetch open job orders', 500));
  }
}

exports.getDiecutStatusReport = asyncHandler(async (req, res, next) => {
  try {
    // Extract filters from query parame
    // ters
    const filters = {
      diecutId: req.query.diecutId,
      diecutType: req.query.diecutType.split(','),
      priority: req.query.priority
    };
    
    diecutType1 = req.query.diecutType.split(',');
    console.log( diecutType1)
    // const { ORG_ID, EMP_ID } = req.user;
    // console.log(JSON.stringify(req.headers.authorization));
    
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