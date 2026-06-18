const router = require('express').Router();
const controller = require('./ocr.controller');
const auth = require('../../middleware/auth');

// TODO: add routes for ocr module
router.get('/', auth, controller.getAll);

module.exports = router;
