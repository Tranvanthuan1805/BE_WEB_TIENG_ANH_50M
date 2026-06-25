const router = require('express').Router();
const controller = require('./classes.controller');
const auth = require('../../middleware/auth');
const { createClassSchema, validate } = require('./classes.validation');

router.get('/', auth, controller.getAll);
router.post('/', auth, validate(createClassSchema), controller.create);

module.exports = router;
