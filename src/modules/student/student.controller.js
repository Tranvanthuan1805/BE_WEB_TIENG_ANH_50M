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

const getExercises = async (req, res, next) => {
  try {
    const data = await service.getStudentExercises(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getExerciseDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await service.getStudentExerciseDetail(req.user, id);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const submitExerciseScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    const data = await service.submitExerciseScore(req.user, id, { score });
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  getScores,
  getExercises,
  getExerciseDetail,
  submitExerciseScore
};
