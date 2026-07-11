const router = require('express').Router();
const controller = require('./teacher.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.get('/scores', auth, requireRole('TEACHER'), controller.getScores);
router.get('/scores/student/:studentId', auth, requireRole('TEACHER'), controller.getStudentDetails);
router.put('/scores/speaking-result/:resultId', auth, requireRole('TEACHER'), upload.single('file'), controller.updateSpeakingFeedback);

module.exports = router;
