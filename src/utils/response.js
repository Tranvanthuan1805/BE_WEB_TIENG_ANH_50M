/**
 * Send a successful JSON response.
 */
const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

/**
 * Send a failure JSON response.
 */
const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, error: message });

module.exports = { ok, fail };
