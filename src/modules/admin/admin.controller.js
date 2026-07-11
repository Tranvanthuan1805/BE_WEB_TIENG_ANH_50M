const service = require('./admin.service');
const { ok, fail } = require('../../utils/response');

// ─── USER CONTROLLER ───

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role } = req.query;
    const data = await service.getUsers({ page, limit, search, role });
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const data = await service.createUser(req.user.id, req.body);
    ok(res, data, 'Tạo người dùng thành công', 201);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const data = await service.updateUser(req.user.id, req.params.id, req.body);
    ok(res, data, 'Cập nhật người dùng thành công');
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const data = await service.deleteUser(req.user.id, req.params.id);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const data = await service.resetPassword(req.user.id, req.params.id, req.body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

// ─── CLASS CONTROLLER ───

const getClasses = async (req, res, next) => {
  try {
    const data = await service.getClasses();
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const createClass = async (req, res, next) => {
  try {
    const data = await service.createClass(req.user.id, req.body);
    ok(res, data, 'Tạo lớp học thành công', 201);
  } catch (err) {
    next(err);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    const data = await service.deleteClass(req.user.id, req.params.id);
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const data = await service.getAuditLogs();
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

// ─── STATS CONTROLLER ───

const getStats = async (req, res, next) => {
  try {
    const { classId, exerciseId, studentId } = req.query;
    const data = await service.getStats({ classId, exerciseId, studentId });
    ok(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getClasses,
  createClass,
  deleteClass,
  getAuditLogs,
  getStats
};
