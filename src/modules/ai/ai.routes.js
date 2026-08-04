const router = require('express').Router();
const controller = require('./ai.controller');
const auth = require('../../middleware/auth');

router.post('/listening/generate', auth, controller.getListeningTask);
router.post('/reading/generate', auth, controller.getReadingTask);
router.post('/writing/generate-prompt', auth, controller.getWritingPrompt);
router.post('/writing/evaluate', auth, controller.evaluateWriting);

module.exports = router;
