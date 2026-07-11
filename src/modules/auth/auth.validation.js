const Joi = require('joi');

/**
 * Validation schema for user registration.
 * - name: 2–50 chars
 * - email: valid email, required
 * - password: min 8 chars, must contain uppercase + number
 * - phone: optional, 10–15 digits
 */
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Tên phải có ít nhất 2 ký tự',
    'string.max': 'Tên không được quá 50 ký tự',
    'any.required': 'Tên là bắt buộc',
  }),
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/(?=.*[A-Z])(?=.*[0-9])/)
    .required()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
      'string.max': 'Mật khẩu không được quá 128 ký tự',
      'string.pattern.base': 'Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 số',
      'any.required': 'Mật khẩu là bắt buộc',
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .allow('', null)
    .optional()
    .messages({
      'string.pattern.base': 'Số điện thoại phải từ 10–15 chữ số',
    }),
  role: Joi.string()
    .valid('TEACHER', 'STUDENT')
    .optional()
    .default('TEACHER')
    .messages({
      'any.only': 'Vai trò không hợp lệ',
    }),
});

/**
 * Validation schema for user login.
 * - email: required
 * - password: required
 */
const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().required().messages({
    'string.empty': 'Email, số điện thoại hoặc mã học sinh không được để trống',
    'any.required': 'Email, số điện thoại hoặc mã học sinh là bắt buộc',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Mật khẩu không được để trống',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
});

/**
 * Validation schema for Google login.
 * - idToken: the token received from Google Sign-In
 */
const googleLoginSchema = Joi.object({
  idToken: Joi.string().required().messages({
    'any.required': 'Google ID Token là bắt buộc',
  }),
});

/**
 * Middleware factory: validate request body against a Joi schema.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    console.error('[VALIDATION ERROR]', messages, 'Req Body:', req.body);
    return res.status(422).json({
      success: false,
      error: 'Dữ liệu không hợp lệ',
      details: messages,
    });
  }

  req.body = value; // use sanitized value
  next();
};

module.exports = {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  validate,
};
