const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const controller = require('./speaking.controller');
const auth = require('../../middleware/auth');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/', auth, controller.getAll);
router.post('/', auth, upload.single('file'), controller.gradeSpeaking);

module.exports = router;
