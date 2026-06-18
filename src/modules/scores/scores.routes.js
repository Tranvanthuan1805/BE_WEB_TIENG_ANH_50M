const router = require('express').Router();
const controller = require('./scores.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for scores module
router.get('/', auth, controller.getAll);

module.exports = router;
