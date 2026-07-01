const service = require('./exercises.service');
const { ok, fail } = require('../../utils/response');

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

const getAll = guard(async (req, res) => {
  const data = await service.getAll(req.user, req.query.classId);
  ok(res, data);
});

const create = guard(async (req, res) => {
  const data = await service.create(req.user, req.body || {});
  ok(res, data, 201);
});

const remove = guard(async (req, res) => {
  const data = await service.remove(req.user, req.params.id);
  ok(res, data);
});

module.exports = { getAll, create, remove };
