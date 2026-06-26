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

// Bọc handler: lỗi có .status → trả thông báo thân thiện; còn lại → next(err).
const guard = (handler) => async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER' && req.user.role !== 'ADMIN') {
      return fail(res, 'Chỉ giáo viên mới có quyền thực hiện thao tác này', 403);
    }
    await handler(req, res);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    next(err);
  }
};

const detail = guard(async (req, res) => {
  const data = await service.getClassDetail(req.user, req.params.id);
  ok(res, data);
});

const update = guard(async (req, res) => {
  const data = await service.updateClass(req.user, req.params.id, req.body || {});
  ok(res, data);
});

const addStudent = guard(async (req, res) => {
  const data = await service.addStudent(req.user, req.params.id, req.body || {});
  ok(res, data, 201);
});

const updateStudent = guard(async (req, res) => {
  const data = await service.updateStudent(req.user, req.params.id, req.params.studentId, req.body || {});
  ok(res, data);
});

const removeStudent = guard(async (req, res) => {
  const data = await service.removeStudent(req.user, req.params.id, req.params.studentId);
  ok(res, data);
});

module.exports = {
  getAll,
  create,
  detail,
  update,
  addStudent,
  updateStudent,
  removeStudent,
};
