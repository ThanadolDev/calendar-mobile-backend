const express = require('express');
const { diecutController, diecutStatusController } = require('../Controllers');
const { protect } = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, 
  }
});

router.use(protect);

router.route('/')
  .get(diecutController.getAllDiecuts)
  .post(upload.single('image'), diecutController.createDiecut);

// router.route('/:id')
//   .get(diecutController.getDiecut)
//   .put(upload.single('image'), diecutController.updateDiecut)
//   .delete(diecutController.deleteDiecut);

router.post('/:id/serial', diecutController.generateSerialNumber);

router.get('/status', diecutController.getDiecutStatusReport);

router.get('/status/summary', diecutController.getDiecutStatusSummary);


router.post('/savediecut', diecutController.saveDiecutSN);

router.post('/getdiecutsn', diecutController.getDiecutSN);

router.post('/cancelorder', diecutController.cancelOrder);

router.post('/getdiecutsndetail', diecutController.getDiecutSNDetail);

router.post('/savediecutmodidetail', diecutController.saveDiecutModiSN);

router.post('/updatejobinfo', diecutController.updateJobInfo);

router.post('/updatedate', diecutController.updatedate);

router.post('/changetyperequest', diecutController.saveTypeRequest);

router.post('/verifyapprover', diecutController.verifyApprover);

router.post('/approvetypechange', diecutController.approveTypeChange);

router.post('/canceltypechange', diecutController.cancelTypeChange);

router.post('/getbladechangecount', diecutController.getBladeChangeCount);

router.post('/orderchange', diecutController.orderChange);

router.get('/types', diecutController.getDiecuttypes);

router.post('/openjobs', diecutController.getDiecutOpenJobs);

module.exports = router;