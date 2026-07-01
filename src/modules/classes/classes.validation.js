const Joi = require('joi');
const { validate } = require('../auth/auth.validation');

const createClassSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Tên lớp không được để trống',
    'any.required': 'Tên lớp là bắt buộc',
  }),
  grade: Joi.any().required().messages({
    'any.required': 'Khối lớp là bắt buộc',
  }),
  description: Joi.string().trim().allow('', null).optional(),
  studentsText: Joi.string().trim().allow('', null).optional(),
  confirmDuplicate: Joi.boolean().optional(),
  passwordType: Joi.string().valid('SAME', 'SEQUENCE').required().messages({
    'any.required': 'Loại mật khẩu là bắt buộc',
    'any.only': 'Loại mật khẩu không hợp lệ',
  }),
  passwordVal: Joi.string().when('passwordType', {
    is: 'SAME',
    then: Joi.string().min(6).required().messages({
      'any.required': 'Mật khẩu chung là bắt buộc',
      'string.empty': 'Mật khẩu chung không được để trống',
      'string.min': 'Mật khẩu chung phải có ít nhất 6 ký tự',
    }),
    otherwise: Joi.string().allow('', null).optional(),
  }),
  basePassword: Joi.string().when('passwordType', {
    is: 'SEQUENCE',
    then: Joi.string().min(4).required().messages({
      'any.required': 'Mật khẩu gốc là bắt buộc',
      'string.empty': 'Mật khẩu gốc không được để trống',
      'string.min': 'Mật khẩu gốc phải có ít nhất 4 ký tự',
    }),
    otherwise: Joi.string().allow('', null).optional(),
  }),
});

module.exports = {
  createClassSchema,
  validate,
};
