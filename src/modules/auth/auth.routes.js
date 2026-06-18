const router = require('express').Router();
const controller = require('./auth.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for auth module
router.get('/', auth, controller.getAll);

module.exports = router;
