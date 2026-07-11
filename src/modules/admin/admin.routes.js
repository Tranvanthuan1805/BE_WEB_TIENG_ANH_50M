const router = require('express').Router();
const controller = require('./admin.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

// All endpoints in this module are ADMIN-only
router.use(auth);
router.use(requireRole('ADMIN'));

// User CRUD
router.get('/users', controller.getUsers);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);
router.post('/users/:id/reset-password', controller.resetPassword);

// Class CRUD
router.get('/classes', controller.getClasses);
router.post('/classes', controller.createClass);
router.delete('/classes/:id', controller.deleteClass);

// Audit logs
router.get('/audit-logs', controller.getAuditLogs);

// Statistics
router.get('/stats', controller.getStats);

module.exports = router;
