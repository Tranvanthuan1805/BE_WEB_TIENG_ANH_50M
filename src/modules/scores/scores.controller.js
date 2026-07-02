const service = require('./scores.service');
const { ok, fail } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const saveScore = async (req, res, next) => {
  try {
    const data = await service.saveScore(req.user, req.body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getExerciseLeaderboard = async (req, res, next) => {
  try {
    const data = await service.getExerciseLeaderboard(req.params.exerciseId, req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, saveScore, getExerciseLeaderboard };
