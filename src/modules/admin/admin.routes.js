const router = require('express').Router();
const controller = require('./admin.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for admin module
router.get('/', auth, controller.getAll);

module.exports = router;
