const router = require('express').Router();
const controller = require('./users.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for users module
router.get('/', auth, controller.getAll);

module.exports = router;
