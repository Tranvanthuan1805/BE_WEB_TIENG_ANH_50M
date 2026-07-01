const router = require('express').Router();
const controller = require('./teacher.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.get('/scores', auth, requireRole('TEACHER'), controller.getScores);
router.get('/scores/student/:studentId', auth, requireRole('TEACHER'), controller.getStudentDetails);

module.exports = router;
