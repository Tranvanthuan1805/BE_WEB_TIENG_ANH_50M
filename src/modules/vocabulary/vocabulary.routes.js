const router = require('express').Router();
const controller = require('./vocabulary.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for vocabulary module
router.get('/', auth, controller.getAll);

module.exports = router;
