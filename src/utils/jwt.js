const jwt = require('jsonwebtoken');
const {
  jwtSecret,
  jwtExpiresIn,
  jwtRefreshSecret,
  jwtRefreshExpiresIn,
} = require('../config/env');

/**
 * Sign an access token (short-lived, 15m default).
 * Payload should contain: { id, email, role }
 */
const signAccessToken = (payload) =>
  jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

/**
 * Sign a refresh token (long-lived, 7d default).
 * Payload should contain: { id }
 */
const signRefreshToken = (payload) =>
  jwt.sign(payload, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });

/**
 * Verify an access token. Throws on invalid/expired.
 */
const verifyAccessToken = (token) => jwt.verify(token, jwtSecret);

/**
 * Verify a refresh token. Throws on invalid/expired.
 */
const verifyRefreshToken = (token) => jwt.verify(token, jwtRefreshSecret);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
