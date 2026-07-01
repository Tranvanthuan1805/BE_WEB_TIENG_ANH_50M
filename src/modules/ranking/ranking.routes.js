const router = require('express').Router();
const controller = require('./ranking.controller');
const auth = require('../../middleware/auth');

router.get('/', auth, controller.getLeaderboard);

module.exports = router;
