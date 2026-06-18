const router = require('express').Router();
const controller = require('./exercises.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for exercises module
router.get('/', auth, controller.getAll);

module.exports = router;
