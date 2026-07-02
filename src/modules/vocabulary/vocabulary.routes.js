const router = require('express').Router();
const controller = require('./vocabulary.controller');
const auth = require('../../middleware/auth');

router.get('/', auth, controller.getAll);
router.get('/garden', auth, controller.getGardenData);
router.get('/quiz', auth, controller.getQuizData);
router.get('/patterns', auth, controller.getPatterns);
router.post('/progress', auth, controller.updateProgress);

module.exports = router;
