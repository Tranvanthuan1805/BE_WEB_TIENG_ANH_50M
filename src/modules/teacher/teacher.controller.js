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

const updateSpeakingFeedback = async (req, res, next) => {
  try {
    const { resultId } = req.params;
    const { teacherFeedback, deleteAudio } = req.body;
    const file = req.file;

    const data = await service.updateSpeakingFeedback(req.user, resultId, {
      teacherFeedback,
      deleteAudio,
      file
    });
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getScores, getStudentDetails, updateSpeakingFeedback };
