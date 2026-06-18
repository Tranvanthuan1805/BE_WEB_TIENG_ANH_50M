const router = require('express').Router();
const controller = require('./gamification.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for gamification module
router.get('/', auth, controller.getAll);

module.exports = router;
