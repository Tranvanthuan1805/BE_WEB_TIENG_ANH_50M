const express = require('express');
const router = express.Router();
const progressController = require('./progress.controller');
const auth = require('../../middleware/auth');

router.use(auth);

// Get all progress for current user
router.get('/all', progressController.getAllProgress);

// Get specific exercise progress
router.get('/:exerciseId/:type', progressController.getProgress);

// Save progress
router.post('/:exerciseId/:type', progressController.saveProgress);

// Save a single answer
router.post('/:exerciseId/:type/answer', progressController.saveAnswer);

// Mark exercise as completed
router.post('/:exerciseId/:type/complete', progressController.markCompleted);

// Delete progress (restart)
router.delete('/:exerciseId/:type', progressController.deleteProgress);

module.exports = router;
