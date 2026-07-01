const service = require('./teacher.service');
const { ok, fail } = require('../../utils/response');

const getScores = async (req, res, next) => {
  try {
    const { classId, period = 'week' } = req.query;
    if (!classId) {
      return fail(res, 'Vui lòng cung cấp classId!', 400);
    }
    const data = await service.getTeacherScores(req.user, { classId, period });
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getStudentDetails = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { period = 'week' } = req.query;
    const data = await service.getStudentDetails(req.user, { studentId, period });
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getScores, getStudentDetails };
