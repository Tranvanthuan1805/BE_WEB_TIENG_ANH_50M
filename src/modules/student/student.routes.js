const router = require('express').Router();
const controller = require('./student.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.get('/scores', auth, requireRole('STUDENT'), controller.getScores);
router.get('/exercises', auth, requireRole('STUDENT'), controller.getExercises);
router.get('/exercises/:id', auth, requireRole('STUDENT'), controller.getExerciseDetail);
router.post('/exercises/:id/submit', auth, requireRole('STUDENT'), controller.submitExerciseScore);

module.exports = router;
