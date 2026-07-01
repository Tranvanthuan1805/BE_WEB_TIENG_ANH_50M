const router = require('express').Router();
const controller = require('./student.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.get('/scores', auth, requireRole('STUDENT'), controller.getScores);

module.exports = router;
