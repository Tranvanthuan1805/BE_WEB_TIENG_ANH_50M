const router = require('express').Router();
const controller = require('./classes.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for classes module
router.get('/', auth, controller.getAll);

module.exports = router;
