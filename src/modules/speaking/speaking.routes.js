const router = require('express').Router();
const controller = require('./speaking.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for speaking module
router.get('/', auth, controller.getAll);

module.exports = router;
