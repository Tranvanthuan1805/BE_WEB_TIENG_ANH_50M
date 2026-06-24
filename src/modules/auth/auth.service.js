const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../../config/database');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const { googleClientId } = require('../../config/env');

const googleClient = new OAuth2Client(googleClientId);

const BCRYPT_ROUNDS = 12;

// ─── Helper: create token pair + store refresh token in DB ───
const createTokenPair = async (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);

  // Generate a unique refresh token string
  const refreshTokenStr = crypto.randomBytes(64).toString('hex');
  const refreshTokenJwt = signRefreshToken({ id: user.id, jti: refreshTokenStr });

  // Store refresh token in DB (hashed for security)
  const hashedToken = crypto.createHash('sha256').update(refreshTokenStr).digest('hex');
  await prisma.refreshToken.create({
    data: {
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return { accessToken, refreshToken: refreshTokenStr };
};

// ─── REGISTER ───
const register = async ({ name, email, password, phone }) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existingUser) {
    const err = new Error('Email này đã được đăng ký');
    err.status = 409;
    throw err;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || null,
      provider: 'LOCAL',
      role: 'TEACHER',
    },
  });

  // Create tokens
  const tokens = await createTokenPair(user);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

// ─── LOGIN ───
const login = async ({ email, password }) => {
  // Find user by email, phone, or studentCode
  const identifier = email.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
        { studentCode: identifier },
        { studentCode: identifier.toUpperCase() },
      ],
    },
  });

  if (!user || user.isDeleted) {
    const err = new Error('Tài khoản hoặc mật khẩu không đúng');
    err.status = 401;
    throw err;
  }

  // Google users must login via Google
  if (user.provider === 'GOOGLE') {
    const err = new Error('Tài khoản này sử dụng đăng nhập Google. Vui lòng đăng nhập bằng Google.');
    err.status = 400;
    throw err;
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error('Tài khoản hoặc mật khẩu không đúng');
    err.status = 401;
    throw err;
  }

  // Create tokens
  const tokens = await createTokenPair(user);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

// ─── GOOGLE LOGIN ───
const googleLogin = async ({ idToken }) => {
  // Verify Google ID token
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
  } catch (err) {
    const error = new Error('Google token không hợp lệ');
    error.status = 401;
    throw error;
  }

  const googlePayload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = googlePayload;

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (user) {
    // If user exists but registered with LOCAL provider, link Google account
    if (user.provider === 'LOCAL') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: 'GOOGLE',
          providerId: googleId,
          avatarUrl: picture || user.avatarUrl,
        },
      });
    }
  } else {
    // Create new user from Google profile
    user = await prisma.user.create({
      data: {
        name: name || 'Google User',
        email: email.toLowerCase(),
        provider: 'GOOGLE',
        providerId: googleId,
        avatarUrl: picture || null,
      },
    });
  }

  if (user.isDeleted) {
    const err = new Error('Tài khoản đã bị vô hiệu hóa');
    err.status = 403;
    throw err;
  }

  // Create tokens
  const tokens = await createTokenPair(user);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

// ─── REFRESH TOKEN ───
const refreshAccessToken = async (refreshTokenStr) => {
  if (!refreshTokenStr) {
    const err = new Error('Refresh token không được cung cấp');
    err.status = 401;
    throw err;
  }

  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(refreshTokenStr).digest('hex');

  // Find token in DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!storedToken) {
    const err = new Error('Refresh token không hợp lệ');
    err.status = 401;
    throw err;
  }

  // Check expiry
  if (storedToken.expiresAt < new Date()) {
    // Delete expired token
    try {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    } catch (e) {
      // Ignore if already deleted by a concurrent process
    }
    const err = new Error('Refresh token đã hết hạn');
    err.status = 401;
    throw err;
  }

  // Rotation: delete old token
  try {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Refresh token không hợp lệ hoặc đã được sử dụng');
      err.status = 401;
      throw err;
    }
    throw error;
  }

  // Create new token pair
  const tokens = await createTokenPair(storedToken.user);

  return {
    user: sanitizeUser(storedToken.user),
    ...tokens,
  };
};

// ─── LOGOUT ───
const logout = async (refreshTokenStr) => {
  if (!refreshTokenStr) return;

  const hashedToken = crypto.createHash('sha256').update(refreshTokenStr).digest('hex');

  try {
    await prisma.refreshToken.delete({ where: { token: hashedToken } });
  } catch {
    // Token not found — already logged out, no-op
  }
};

// ─── GET CURRENT USER ───
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.isDeleted) {
    const err = new Error('Người dùng không tồn tại');
    err.status = 404;
    throw err;
  }

  return sanitizeUser(user);
};

// ─── Helper: strip sensitive fields from user object ───
const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  role: user.role,
  provider: user.provider,
  createdAt: user.createdAt,
});

module.exports = {
  register,
  login,
  googleLogin,
  refreshAccessToken,
  logout,
  getMe,
};
