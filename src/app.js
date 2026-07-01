const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { frontendUrl } = require('./config/env');

const app = express();

// ── Security Headers ──
app.use(helmet());

// ── CORS (strict: only allow frontend origin) ──
app.use(cors({
  origin: frontendUrl,
  credentials: true, // allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsers ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Cookie Parser (for HttpOnly refresh token) ──
app.use(cookieParser());

// ── Serve uploads folder for speaking results ──
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Global Rate Limiting ──
app.use('/api', apiLimiter);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/classes', require('./modules/classes/classes.routes'));
app.use('/api/exercises', require('./modules/exercises/exercises.routes'));
app.use('/api/vocabulary', require('./modules/vocabulary/vocabulary.routes'));
app.use('/api/scores', require('./modules/scores/scores.routes'));
app.use('/api/speaking', require('./modules/speaking/speaking.routes'));
app.use('/api/ocr', require('./modules/ocr/ocr.routes'));
app.use('/api/gamification', require('./modules/gamification/gamification.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));
app.use('/api/ranking', require('./modules/ranking/ranking.routes'));
app.use('/api/teacher', require('./modules/teacher/teacher.routes'));
app.use('/api/student', require('./modules/student/student.routes'));

// ── Error Handler (must be last) ──
app.use(errorHandler);

module.exports = app;
