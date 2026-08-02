const router = require('express').Router();
const controller = require('./auth.controller');
const auth = require('../../middleware/auth');
const { validate, registerSchema, loginSchema, googleLoginSchema } = require('./auth.validation');
const { authLimiter } = require('../../middleware/rateLimiter');

// Public routes (rate-limited)
router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/google', authLimiter, validate(googleLoginSchema), controller.googleLogin);

// Public AI Song generation
const studentService = require('../student/student.service');
const { ok } = require('../../utils/response');
router.post('/generate-song', authLimiter, async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const data = await studentService.generateSong(null, { prompt });
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// Token routes
router.post('/refresh', controller.refreshToken);
router.post('/logout', controller.logout);

// Protected routes
router.get('/me', auth, controller.getMe);

module.exports = router;
