/**
 * Role-Based Access Control (RBAC) middleware factory.
 *
 * Usage: router.get('/admin', auth, requireRole('ADMIN'), handler)
 *        router.get('/manage', auth, requireRole('ADMIN', 'TEACHER'), handler)
 *
 * Must be used AFTER the auth middleware (which sets req.user).
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Chưa xác thực. Vui lòng đăng nhập.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền truy cập chức năng này.',
      });
    }

    next();
  };
};

module.exports = { requireRole };
