const service = require('./speaking.service');
const { ok, fail } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const gradeSpeaking = async (req, res, next) => {
  try {
    const { exerciseId, correctText } = req.body;
    const file = req.file;
    const data = await service.gradeSpeaking(req.user, { exerciseId, correctText, file });
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, gradeSpeaking };
