const router = require('express').Router();
const controller = require('./exercises.controller');
const auth = require('../../middleware/auth');

router.get('/', auth, controller.getAll);          // danh sách bài đã giao (?classId=)
router.get('/student', auth, controller.getAllForStudent); // danh sách bài cho học sinh
router.get('/student/:id/quiz', auth, controller.getQuizForStudent); // lấy đề thi trắc nghiệm theo bài
router.get('/student/:id/vocab', auth, controller.getVocabForStudent); // lấy từ vựng theo bài
router.get('/student/:id/pattern', auth, controller.getPatternForStudent); // lấy mẫu câu theo bài
router.post('/', auth, controller.create);         // giao bài (lưu Exercise)
router.delete('/:id', auth, controller.remove);    // xóa mềm bài tập

module.exports = router;
