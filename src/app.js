const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

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

app.use(errorHandler);

module.exports = app;
