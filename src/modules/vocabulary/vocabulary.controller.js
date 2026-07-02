const service = require('./vocabulary.service');
const { ok, fail } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getGardenData = async (req, res, next) => {
  try {
    const data = await service.getGardenData(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getQuizData = async (req, res, next) => {
  try {
    const data = await service.getQuizData(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const updateProgress = async (req, res, next) => {
  try {
    const { vocabularyId, isCorrect } = req.body;
    if (!vocabularyId) return fail(res, 'Missing vocabularyId', 400);
    const data = await service.updateProgress(req.user, vocabularyId, isCorrect);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getPatterns = async (req, res, next) => {
  try {
    const data = await service.getPatterns(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getGardenData, getQuizData, updateProgress, getPatterns };
