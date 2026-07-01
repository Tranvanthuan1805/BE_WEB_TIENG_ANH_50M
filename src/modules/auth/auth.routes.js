const router = require('express').Router();
const controller = require('./auth.controller');
const auth = require('../../middleware/auth');
const { validate, registerSchema, loginSchema, googleLoginSchema } = require('./auth.validation');
const { authLimiter } = require('../../middleware/rateLimiter');

// Public routes (rate-limited)
router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/google', authLimiter, validate(googleLoginSchema), controller.googleLogin);

// Token routes
router.post('/refresh', controller.refreshToken);
router.post('/logout', controller.logout);

// Protected routes
router.get('/me', auth, controller.getMe);

module.exports = router;
