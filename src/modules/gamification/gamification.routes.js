const router = require('express').Router();
const controller = require('./gamification.controller');
const auth = require('../../middleware/auth');

router.get('/', auth, controller.getAll);
router.get('/leaderboard', auth, controller.getLeaderboard);
router.get('/progress', auth, controller.getProgress);

module.exports = router;
