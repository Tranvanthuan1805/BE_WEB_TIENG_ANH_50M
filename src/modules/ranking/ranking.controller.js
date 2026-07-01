const service = require('./ranking.service');
const { ok, fail } = require('../../utils/response');

const getLeaderboard = async (req, res, next) => {
  try {
    const { classId, period = 'all' } = req.query;
    const rankings = await service.getLeaderboard({ classId, period });
    ok(res, rankings);
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeaderboard };
