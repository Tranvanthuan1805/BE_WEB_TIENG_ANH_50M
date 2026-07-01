const crypto = require('crypto');
const https = require('https');
const OpenAI = require('openai');
const env = require('../../config/env');
const scheduler = require('./ocr.scheduler');

/**
 * OCR SERVICE — "tài liệu → tiếng Anh có cấu trúc" cho app học tiếng Anh.
 *
 * Nhận ẢNH / Word(.docx) / PDF, trả JSON 3 nhóm để FE tự điền vào form giao bài:
 *   { vocabularies:[{word,type,phonetic,meaning}],
 *     sentences:[{sentence,translation}],
 *     questions:[{question,options[],answer}] }
 *
 * Nguyên tắc (theo docs/Game/ocr_mechanism_analysis.md):
 *  - ẢNH  → Vision LLM (đọc base64).
 *  - Word → đọc text tại máy (mammoth) rồi gửi text-only → nhanh & rẻ hơn nhiều.
 *  - PDF  → đọc text (pdf-parse). PDF scan (không có chữ) → 422, gợi ý tải dạng ảnh.
 *  - Provider đổi được bằng env (gemini | openrouter), đều qua `openai` SDK (chỉ đổi baseURL+key).
 *  - Chịu tải: qua scheduler (giới hạn đồng thời + req/phút) + cache theo hash + gộp request trùng
 *    + circuit-breaker (model 429 → nghỉ cooldown, đổi model NGAY) + timeout, maxRetries=0.
 */

// Máy dev này can thiệp HTTPS (cert lỗi). openai SDK 4.x đi qua global fetch (undici) nên
// KHÔNG tôn trọng httpAgent → phải tắt verify ở cấp tiến trình. Chỉ bật khi OCR_INSECURE_TLS=true
// (chỉ đặt ở .env máy dev); production không set cờ này nên TLS vẫn an toàn.
if (env.ocrInsecureTls) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ── Provider client (gemini | openrouter), cùng đi qua openai SDK ──
const agent = env.ocrInsecureTls ? new https.Agent({ rejectUnauthorized: false }) : undefined;

const buildClient = () => {
  if (env.ocrProvider === 'openrouter') {
    return new OpenAI({ apiKey: env.openrouterApiKey, baseURL: env.openrouterBaseUrl, httpAgent: agent, maxRetries: 0 });
  }
  // Mặc định: Gemini qua endpoint OpenAI-compatible.
  return new OpenAI({ apiKey: env.geminiApiKey, baseURL: env.geminiBaseUrl, httpAgent: agent, maxRetries: 0 });
};
const llm = buildClient();

// ── Prompt: yêu cầu phân loại 3 nhóm (vocab / sentence / MCQ) ──
// Prompt GỌN để OCR nhanh: KHÔNG yêu cầu phonetic/translation (autofill không dùng; IPA lấy
// từ dictionaryapi.dev, dịch lấy từ MyMemory ở bước generate) → ít token sinh ra hơn.
const SYSTEM_PROMPT = `You are an OCR + extraction engine for an English-learning app (Vietnamese school context).

From the INPUT (an image or a block of text): read/OCR the English accurately (fix obvious typos), then classify into THREE groups:
- "vocabularies": [{ "word": English word lowercase base form, "type": one of n|v|adj|adv|phrase, "meaning": SHORT Vietnamese gloss ("" if unsure) }]
- "sentences": [{ "sentence": a full English example/model sentence, verbatim & trimmed }]
- "questions": multiple-choice questions: [{ "question": the stem (keep blanks like "____"), "options": the choices WITHOUT "A./B./C./D." prefixes, "answer": the correct letter "A".."D" if determinable from an answer key, else "" }]

Rules: "word"/"sentence" English only; deduplicate vocabularies; skip page numbers, codes, headers, non-English noise; a multiple-choice line goes ONLY in "questions"; a standalone model sentence goes ONLY in "sentences"; empty group → [].

Return JSON EXACTLY (no markdown, no extra keys):
{ "vocabularies": [ { "word": "", "type": "", "meaning": "" } ],
  "sentences":     [ { "sentence": "" } ],
  "questions":     [ { "question": "", "options": [], "answer": "" } ] }`;

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ── Chuẩn hóa & chống rác ──
const VALID_TYPES = new Set(['n', 'v', 'adj', 'adv', 'phrase']);
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const normalize = (raw, caps = {}) => {
  const { v: maxV = 120, s: maxS = 120, q: maxQ = 80 } = caps; // cap mỗi LẦN gọi (mỗi đợt giữ đủ)
  const seen = new Set();
  const vocabularies = (raw?.vocabularies ?? [])
    .map((v) => ({
      word: String(v.word || '').trim().toLowerCase(),
      type: VALID_TYPES.has(v.type) ? v.type : 'n',
      phonetic: String(v.phonetic || '').trim(),
      meaning: String(v.meaning || v.meaningDraft || '').trim(),
    }))
    .filter((v) => v.word && /[a-z]/i.test(v.word) && !seen.has(v.word) && seen.add(v.word))
    .slice(0, maxV);

  const sentences = (raw?.sentences ?? [])
    .map((s) => ({
      sentence: String(s.sentence || '').trim(),
      translation: String(s.translation || '').trim(),
    }))
    .filter((s) => s.sentence.split(/\s+/).length >= 2)
    .slice(0, maxS);

  const questions = (raw?.questions ?? [])
    .map((q) => {
      const options = (Array.isArray(q.options) ? q.options : [])
        .map((o) => String(o || '').replace(/^\s*[A-Fa-f][).．\.]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 6);
      let answer = String(q.answer || '').trim().toUpperCase();
      if (!/^[A-F]$/.test(answer)) answer = ''; // chỉ giữ A–F hợp lệ
      return { question: String(q.question || '').trim(), options, answer };
    })
    .filter((q) => q.question && q.options.length >= 2)
    .slice(0, maxQ);

  return { vocabularies, sentences, questions };
};

// ── Circuit-breaker theo model: 429 → nghỉ cooldown, ưu tiên model khác ngay ──
const cooldownUntil = new Map(); // model -> timestamp ms
const isCoolingDown = (model) => (cooldownUntil.get(model) || 0) > Date.now();
const markCooldown = (model) => cooldownUntil.set(model, Date.now() + env.ocrModelCooldownMs);

const is429 = (err) => (err?.status || err?.response?.status) === 429;
const is5xx = (err) => {
  const s = err?.status || err?.response?.status;
  return s >= 500 && s < 600;
};

/** Một lần gọi model (text hoặc vision tùy messages). Có timeout. */
const callModel = async (model, messages) => {
  const params = {
    model,
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 8192, // đủ cho output JSON 1 đợt (~5k ký tự input) → tránh JSON bị cắt
  };
  // Tắt "thinking" của Gemini 2.5 để nhanh hơn (chỉ áp dụng khi có cấu hình).
  if (env.ocrReasoningEffort) params.reasoning_effort = env.ocrReasoningEffort;

  const completion = await llm.chat.completions.create(params, { timeout: env.ocrCallTimeoutMs });
  const content = completion.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
};

/**
 * Thử model chính → fallback theo thứ tự. Bỏ qua model đang cooldown.
 * 429/5xx: đổi model NGAY (không backoff). Hết model → ném lỗi cuối.
 */
const callWithFallback = async (messages) => {
  const chain = [env.ocrModel, ...env.ocrFallbackModels].filter((m, i, a) => m && a.indexOf(m) === i);
  const ready = chain.filter((m) => !isCoolingDown(m));
  const order = ready.length ? ready : chain; // tất cả đang nghỉ → vẫn thử theo thứ tự

  let lastErr;
  for (const model of order) {
    try {
      const data = await scheduler.schedule(() => callModel(model, messages));
      return { data, model };
    } catch (err) {
      lastErr = err;
      if (is429(err)) { markCooldown(model); continue; }
      if (is5xx(err)) continue;
      throw err; // lỗi không phải tạm thời (vd JSON hỏng, 4xx khác) → dừng
    }
  }
  throw lastErr || new Error('OCR_ALL_MODELS_FAILED');
};

// ── Build messages theo loại nguồn ──
const visionMessages = (buffer, mimeType) => {
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract vocabularies, sentences and multiple-choice questions from this image.' },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ];
};

const textMessages = (text) => [
  { role: 'system', content: SYSTEM_PROMPT },
  {
    role: 'user',
    content:
      'Extract vocabularies, sentences and multiple-choice questions from the following document text.\n\n--- DOCUMENT START ---\n' +
      text.slice(0, 16000) +
      '\n--- DOCUMENT END ---',
  },
];

// ── Chia text dài thành nhiều ĐỢT theo ranh giới dòng (không cắt giữa dòng) ──
const CHUNK_CHARS = Number(process.env.OCR_CHUNK_CHARS) || 5000; // ~mỗi đợt → output JSON gọn, không vượt max_tokens

const chunkText = (text, maxChars = CHUNK_CHARS) => {
  const lines = String(text).split('\n');
  const chunks = [];
  let cur = '';
  for (const line of lines) {
    if (cur && cur.length + line.length + 1 > maxChars) { chunks.push(cur); cur = ''; }
    if (line.length > maxChars) { // 1 dòng quá dài (blob không xuống dòng) → cắt cứng
      if (cur) { chunks.push(cur); cur = ''; }
      for (let i = 0; i < line.length; i += maxChars) chunks.push(line.slice(i, i + maxChars));
      continue;
    }
    cur = cur ? `${cur}\n${line}` : line;
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [''];
};

// Gộp kết quả nhiều đợt + KHỬ TRÙNG (giữ hết, cap tổng rộng rãi để không bỏ sót).
const mergeChunks = (parts) => {
  const vSeen = new Set(); const sSeen = new Set(); const qSeen = new Set();
  const vocabularies = []; const sentences = []; const questions = [];
  parts.forEach((p) => {
    (p.vocabularies || []).forEach((v) => { if (v.word && !vSeen.has(v.word)) { vSeen.add(v.word); vocabularies.push(v); } });
    (p.sentences || []).forEach((s) => { const k = s.sentence.trim().toLowerCase(); if (k && !sSeen.has(k)) { sSeen.add(k); sentences.push(s); } });
    (p.questions || []).forEach((q) => { const k = q.question.trim().toLowerCase(); if (k && !qSeen.has(k)) { qSeen.add(k); questions.push(q); } });
  });
  return { vocabularies: vocabularies.slice(0, 600), sentences: sentences.slice(0, 600), questions: questions.slice(0, 400) };
};

/**
 * Trích xuất từ TEXT, tự chia ĐỢT nếu dài → gọi song song (qua scheduler) → gộp + dedupe.
 * @returns {{ data, model, chunks:number }}
 */
const CHUNK_CAPS = { v: 300, s: 300, q: 200 }; // mỗi đợt giữ đủ, không bị cắt sớm
const runTextExtraction = async (text) => {
  const chunks = chunkText(text);
  if (chunks.length === 1) {
    const { data, model } = await callWithFallback(textMessages(chunks[0]));
    return { data: normalize(data, CHUNK_CAPS), model, chunks: 1, failedChunks: 0 };
  }
  // Nhiều đợt: scheduler tự giới hạn đồng thời + req/phút. allSettled → 1 đợt lỗi KHÔNG làm hỏng cả bài.
  const settled = await Promise.allSettled(
    chunks.map(async (c) => {
      const { data, model } = await callWithFallback(textMessages(c));
      return { norm: normalize(data, CHUNK_CAPS), model };
    }),
  );
  const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const failedChunks = settled.length - ok.length;
  if (ok.length === 0) throw settled[0].reason; // tất cả đợt lỗi → để controller báo (vd 429)
  return {
    data: mergeChunks(ok.map((r) => r.norm)),
    model: ok[0]?.model || env.ocrModel,
    chunks: chunks.length,
    failedChunks,
  };
};

// ── Đọc text tại máy cho Word / PDF ──
const extractDocxText = async (buffer) => {
  const mammoth = require('mammoth');
  const { value } = await mammoth.extractRawText({ buffer });
  return (value || '').trim();
};

const extractPdfText = async (buffer) => {
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const res = await parser.getText();
  return (res?.text || '').trim();
};

const detectSource = (mimeType, filename = '') => {
  const mt = (mimeType || '').toLowerCase();
  const name = filename.toLowerCase();
  if (mt.startsWith('image/')) return 'image';
  if (mt.includes('wordprocessingml') || name.endsWith('.docx')) return 'docx';
  if (mt === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  return 'unknown';
};

// ── Cache in-memory theo hash nội dung (+ coalescing request trùng) ──
const CACHE_VERSION = 'v2-mcq'; // đổi khi schema/prompt đổi → vô hiệu cache cũ
const cache = new Map(); // hash -> { value, expireAt }
const inflight = new Map(); // hash -> Promise
const getCache = (k) => {
  const h = cache.get(k);
  if (!h) return undefined;
  if (h.expireAt <= Date.now()) { cache.delete(k); return undefined; }
  return h.value;
};
const setCache = (k, v) => {
  if (cache.size >= env.ocrCacheMax) cache.delete(cache.keys().next().value);
  cache.set(k, { value: v, expireAt: Date.now() + env.ocrCacheTtlMs });
};

/**
 * Trích xuất từ 1 file đã upload (buffer).
 * @returns {{ model, source, cached, data:{vocabularies,sentences,questions} }}
 */
const extractFromFile = async (buffer, mimeType, filename = '') => {
  const source = detectSource(mimeType, filename);
  if (source === 'unknown') {
    const e = new Error('UNSUPPORTED_FILE_TYPE');
    e.code = 'UNSUPPORTED_FILE_TYPE';
    throw e;
  }

  const hash = `${CACHE_VERSION}:${source}:${sha256(buffer)}`;

  // 1) Cache hit → trả ngay (0 token).
  const hit = getCache(hash);
  if (hit) return { ...hit, cached: true };

  // 2) Gộp request trùng (cùng file, cùng lúc).
  if (inflight.has(hash)) return { ...(await inflight.get(hash)), cached: true };

  const job = (async () => {
    let result;
    if (source === 'image') {
      // Ảnh = 1 lần gọi vision (không chia đợt được như text).
      const { data: raw, model } = await callWithFallback(visionMessages(buffer, mimeType));
      result = { model, source, cached: false, chunks: 1, failedChunks: 0, data: normalize(raw) };
    } else {
      const text = source === 'docx' ? await extractDocxText(buffer) : await extractPdfText(buffer);
      if (!text || text.replace(/\s/g, '').length < 5) {
        const e = new Error('NO_TEXT_IN_DOCUMENT');
        e.code = 'NO_TEXT_IN_DOCUMENT'; // PDF scan / file rỗng → gợi ý tải dạng ảnh
        throw e;
      }
      // Word/PDF dài → chia ĐỢT, gọi song song, gộp hết.
      const { data, model, chunks, failedChunks } = await runTextExtraction(text);
      result = { model, source, cached: false, chunks, failedChunks, data };
    }
    setCache(hash, result);
    return result;
  })();

  inflight.set(hash, job);
  try {
    return await job;
  } finally {
    inflight.delete(hash);
  }
};

/**
 * Trích xuất trực tiếp từ một đoạn TEXT (vd: GV dán nội dung, hoặc dùng để test).
 * @returns {{ model, source:'text', cached:false, data }}
 */
const extractFromText = async (text) => {
  const clean = String(text || '').trim();
  if (clean.replace(/\s/g, '').length < 5) {
    const e = new Error('NO_TEXT_IN_DOCUMENT');
    e.code = 'NO_TEXT_IN_DOCUMENT';
    throw e;
  }
  const { data, model, chunks, failedChunks } = await runTextExtraction(clean);
  return { model, source: 'text', cached: false, chunks, failedChunks, data };
};

module.exports = {
  extractFromFile,
  extractFromText,
  normalize,
  chunkText,
  mergeChunks,
  sha256,
  detectSource,
  schedulerStats: scheduler.stats,
};
