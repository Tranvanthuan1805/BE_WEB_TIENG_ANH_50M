const router = require('express').Router();
const multer = require('multer');
const controller = require('./ocr.controller');

// memoryStorage: giữ buffer để hash + gửi LLM / parse tại máy, KHÔNG ghi đĩa.
const ALLOWED = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // ≤ 20MB (ảnh đã nén ở client nhỏ hơn nhiều)
  fileFilter: (_req, file, cb) => {
    const okExt = /\.(png|jpe?g|webp|gif|pdf|docx)$/i.test(file.originalname || '');
    const ok = ALLOWED.includes(file.mimetype) || okExt;
    cb(ok ? null : new Error('Định dạng tệp không hỗ trợ'), ok);
  },
});

// Bắt lỗi multer (file quá lớn / sai định dạng) → JSON thân thiện thay vì 500.
const uploadSingle = (req, res, next) =>
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 415).json({
      success: false,
      error: tooBig ? 'Tệp quá lớn (tối đa 20MB).' : 'Định dạng tệp không hỗ trợ. Vui lòng tải ảnh, Word (.docx) hoặc PDF.',
    });
  });

// OCR nhanh: ảnh/Word/PDF → { vocabularies, sentences, questions }. Route mở (chưa gắn auth).
router.post('/extract', uploadSingle, controller.extract);

// Làm giàu (defer/lazy) — JSON.
router.post('/enrich', controller.enrichContent);       // Tầng 1: phiên âm/audio/dịch
router.post('/distractors', controller.distractors);    // Tầng 2: từ nhiễu dễ

// Sinh bài tập & dọn định dạng — JSON.
router.post('/parse-text', controller.parseText);       // AI dọn dẹp & phân loại text dán bừa
router.post('/generate', controller.generate);          // 3 ô text → JSON đủ 3 game + quiz

module.exports = router;
