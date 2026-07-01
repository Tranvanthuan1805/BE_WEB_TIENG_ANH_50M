const service = require('./student.service');
const { ok } = require('../../utils/response');

const getScores = async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    const data = await service.getStudentScores(req.user, { period });
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getScores };
