const service = require('./ocr.service');
const enrich = require('./enrich.service');
const games = require('./games.service');
const { ok, fail } = require('../../utils/response');

/** Map lỗi kỹ thuật → thông báo tiếng Việt + HTTP status hợp lý. */
const explain = (err) => {
  const status = err?.status || err?.response?.status;
  switch (err?.code) {
    case 'UNSUPPORTED_FILE_TYPE':
      return [415, 'Định dạng tệp không hỗ trợ. Vui lòng tải ảnh, Word (.docx) hoặc PDF.'];
    case 'NO_TEXT_IN_DOCUMENT':
      return [422, 'Không đọc được chữ trong tệp (có thể là PDF scan/ảnh trong Word). Hãy thử tải lên dưới dạng ảnh.'];
    default:
      break;
  }
  if (status === 429) {
    const msg = String(err?.message || '');
    if (/per[\s-]?day|daily|RPD/i.test(msg)) {
      return [429, 'Đã đạt giới hạn lượt OCR trong ngày của AI. Vui lòng thử lại vào ngày mai hoặc nhập tay.'];
    }
    return [429, 'Hệ thống AI đang quá tải tạm thời. Vui lòng thử lại sau giây lát.'];
  }
  if (status === 401 || status === 403) {
    return [502, 'Cấu hình khóa AI không hợp lệ. Vui lòng báo quản trị viên.'];
  }
  return [502, 'Không trích xuất được nội dung. Vui lòng thử lại hoặc nhập tay.'];
};

/** POST /api/ocr/extract — multipart field "file" (ảnh / .docx / .pdf). */
const extract = async (req, res) => {
  try {
    if (!req.file) return fail(res, 'Thiếu tệp tải lên (field "file").', 400);
    const result = await service.extractFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    return ok(res, result);
  } catch (err) {
    console.error('[OCR] extract error:', err?.status || '', err?.code || err?.message);
    const [status, message] = explain(err);
    return fail(res, message, status);
  }
};

/** POST /api/ocr/enrich — JSON { vocabularies, sentences } (Tầng 1, defer). */
const enrichContent = async (req, res, next) => {
  try {
    const data = await enrich.enrichAll(req.body || {});
    return ok(res, data);
  } catch (err) {
    next(err);
  }
};

/** POST /api/ocr/distractors — JSON { vocabularies, max } (Tầng 2, lazy). */
const distractors = async (req, res, next) => {
  try {
    const { vocabularies = [], max } = req.body || {};
    const result = await enrich.addDistractors(vocabularies, { max });
    return ok(res, { vocabularies: result });
  } catch (err) {
    next(err);
  }
};

/** POST /api/ocr/generate — JSON { vocabText, sentenceText, mcqText, grade } → 3 game + quiz. */
const generate = async (req, res, next) => {
  try {
    const result = await games.generate(req.body || {});
    return ok(res, result);
  } catch (err) {
    next(err);
  }
};

/** POST /api/ocr/parse-text — JSON { text } → AI dọn dẹp & phân loại nội dung dán bừa. */
const parseText = async (req, res) => {
  try {
    const { text } = req.body || {};
    const result = await service.extractFromText(text);
    return ok(res, result);
  } catch (err) {
    console.error('[OCR] parse-text error:', err?.status || '', err?.code || err?.message);
    const [status, message] = explain(err);
    return fail(res, message, status);
  }
};

module.exports = { extract, enrichContent, distractors, generate, parseText };
