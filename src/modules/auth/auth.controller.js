const authService = require('./auth.service');
const { ok, fail } = require('../../utils/response');

const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// ─── POST /api/auth/register ───
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    // Set refresh token in HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

    ok(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ───
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    // Set refresh token in HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

    ok(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/google ───
const googleLogin = async (req, res, next) => {
  try {
    const result = await authService.googleLogin(req.body);

    console.log(`[DEBUG] Google login successful. Setting refresh token cookie: ${result.refreshToken ? result.refreshToken.substring(0, 8) + '...' : 'null'}`);
    // Set refresh token in HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

    ok(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    console.error(`[DEBUG] Google login error:`, err);
    next(err);
  }
};

// ─── POST /api/auth/refresh ───
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    console.log(`[DEBUG] Refreshing token. Received cookie '${REFRESH_COOKIE_NAME}': ${token ? token.substring(0, 8) + '...' : 'undefined'}`);
    const result = await authService.refreshAccessToken(token);

    console.log(`[DEBUG] Token refreshed successfully. Setting new refresh token cookie: ${result.refreshToken ? result.refreshToken.substring(0, 8) + '...' : 'null'}`);
    // Set new refresh token (rotation)
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

    ok(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    console.error(`[DEBUG] Refresh token error:`, err.message);
    next(err);
  }
};

// ─── POST /api/auth/logout ───
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(token);

    // Clear cookie
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    ok(res, { message: 'Đăng xuất thành công' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ───
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    ok(res, user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  refreshToken,
  logout,
  getMe,
};
