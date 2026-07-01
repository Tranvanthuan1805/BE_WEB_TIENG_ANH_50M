const router = require('express').Router();
const controller = require('./exercises.controller');
const auth = require('../../middleware/auth');

router.get('/', auth, controller.getAll);          // danh sách bài đã giao (?classId=)
router.post('/', auth, controller.create);         // giao bài (lưu Exercise)
router.delete('/:id', auth, controller.remove);    // xóa mềm bài tập

module.exports = router;
