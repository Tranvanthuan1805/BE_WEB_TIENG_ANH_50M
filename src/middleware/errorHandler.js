/**
 * Global error handler middleware.
 * Catches all errors and returns a structured JSON response.
 */
const errorHandler = (err, req, res, _next) => {
  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${err.status || 500} - ${err.message}`);
    if (err.stack) console.error(err.stack);
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Lỗi hệ thống. Vui lòng thử lại sau.' : err.message;

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && status === 500 && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
