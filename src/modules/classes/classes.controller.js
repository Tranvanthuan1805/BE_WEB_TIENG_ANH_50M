const service = require('./classes.service');
const { ok, fail } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.user);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return fail(res, 'Chỉ giáo viên mới có quyền tạo lớp học', 403);
    }
    const data = await service.createClass(req.user, req.body);
    if (data.isDuplicateWarning) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_CLASS_NAME',
        message: data.message,
      });
    }
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  create,
};
