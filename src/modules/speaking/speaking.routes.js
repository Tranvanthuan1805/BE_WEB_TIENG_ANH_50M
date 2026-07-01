const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const controller = require('./speaking.controller');
const auth = require('../../middleware/auth');

const uploadDir = path.join(__dirname, '../../../uploads/speaking');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'speaking-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/', auth, controller.getAll);
router.post('/', auth, upload.single('file'), controller.gradeSpeaking);

module.exports = router;
