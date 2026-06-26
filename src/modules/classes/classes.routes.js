const router = require('express').Router();
const controller = require('./classes.controller');
const auth = require('../../middleware/auth');
const { createClassSchema, validate } = require('./classes.validation');

router.get('/', auth, controller.getAll);
router.post('/', auth, validate(createClassSchema), controller.create);

// Chi tiết lớp + roster học sinh
router.get('/:id', auth, controller.detail);
// Sửa lớp (tên/mô tả)
router.patch('/:id', auth, controller.update);
// CRUD học sinh trong lớp (xóa = xóa mềm)
router.post('/:id/students', auth, controller.addStudent);
router.patch('/:id/students/:studentId', auth, controller.updateStudent);
router.delete('/:id/students/:studentId', auth, controller.removeStudent);

module.exports = router;
