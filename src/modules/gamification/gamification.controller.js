const service = require('./gamification.service');
const { ok, fail } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const currentUserId = req.user.id;
    const data = await service.getLeaderboard(limit, currentUserId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getProgress = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const data = await service.getProgress(currentUserId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getLeaderboard, getProgress };
