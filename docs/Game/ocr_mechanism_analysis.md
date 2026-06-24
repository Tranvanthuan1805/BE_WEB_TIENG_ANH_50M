# 👁️ THIẾT KẾ CƠ CHẾ OCR & TRÍCH XUẤT TIẾNG ANH (BẢN TỐI ƯU v2)

> **Tài liệu kỹ thuật** mô tả cơ chế OCR (Optical Character Recognition) nhận dạng chữ từ ảnh tài liệu học tập (SGK, đề bài, bảng viết) và trích xuất thành **Từ vựng + Mẫu câu tiếng Anh** để đưa vào pipeline sinh game.
>
> **Ràng buộc cốt lõi của dự án:** Chi phí API **$0/tháng** • Độ chính xác cao • Dữ liệu đầu ra khớp đúng định dạng FE & pipeline game đang dùng.

---

## 0. ⚠️ NHỮNG GÌ ĐÃ THAY ĐỔI SO VỚI BẢN v1 (VÀ LÝ DO)

Bản v1 chạy được về mặt ý tưởng nhưng **không khớp với codebase thật** và có vài lỗi kỹ thuật. Bản v2 sửa lại:

| # | Vấn đề ở bản v1 | Cách v2 xử lý |
|---|---|---|
| 1 | Dùng `@google/generative-ai` với class `GoogleGenAI` → **sai package**. `GoogleGenAI` thuộc package mới `@google/genai`; còn `@google/generative-ai` (cũ) dùng class `GoogleGenerativeAI`. Trộn 2 cái sẽ crash. | **Bỏ hẳn dependency Google.** Dự án **đã có `openai` SDK** (`package.json`). Trỏ `baseURL` của chính SDK này vào **endpoint OpenAI-compatible của Gemini** → không thêm thư viện, vẫn $0. |
| 2 | Model `gemini-1.5-flash` đã cũ / đang bị khai tử dần. | Dùng `gemini-2.0-flash` (hoặc `gemini-2.5-flash`) — free tier, OCR tốt hơn, nhanh hơn. |
| 3 | Prompt "đừng bọc trong ```json```" → **rất dễ vỡ** (model vẫn hay bọc, vẫn thêm chữ thừa). | Bật **JSON mode** (`response_format: { type: 'json_object' }`) + **validate schema** trước khi lưu. |
| 4 | Bắt LLM vừa OCR **vừa dịch nghĩa + gán loại từ** → **trùng lặp** với pipeline game (file `GAME_GENERATION_OPTIMIZATION.md` đã dùng dictionaryapi.dev + MyMemory + Datamuse có cache). | **Tách trách nhiệm:** OCR chỉ trích **tiếng Anh** (word + sentence). Phiên âm / audio / nghĩa VN / từ nhiễu → để **pipeline enrichment có sẵn** lo (1 nguồn sự thật, cache tốt hơn). LLM chỉ trả thêm **nghĩa nháp** để fill UI tức thì (tùy chọn). |
| 5 | Output JSON không khớp định dạng FE đang dùng. | FE (`TeacherHomework.jsx`) đang ăn định dạng dòng `word (type) - meaning` + câu thuần. v2 định nghĩa rõ **hợp đồng dữ liệu 2 chiều** (JSON ⇄ text dòng). |
| 6 | Lưu cả `rawText`/ảnh base64 vào DB. | Cache theo **hash ảnh**, chỉ lưu **cấu trúc tiếng Anh** (không lưu ảnh, không lưu bản dịch) → cache tái dùng tối đa, nhẹ DB, an toàn hơn. |

---

## 1. 🧭 NGUYÊN TẮC THIẾT KẾ

1. **OCR ≠ Enrichment.** OCR chỉ làm 1 việc: *ảnh → tiếng Anh sạch, có cấu trúc*. Mọi thứ "làm giàu" (IPA, audio, nghĩa VN chuẩn, từ nhiễu) thuộc về pipeline game đã thiết kế. Tách ra giúp cache hiệu quả, dễ test, dễ đổi engine.
2. **Tái dùng cái đã có.** Dùng lại `openai` SDK + bảng cache theo triết lý của `GAME_GENERATION_OPTIMIZATION.md`. Không phá vỡ kiến trúc module hiện tại (`src/modules/ocr/`).
3. **Provider-agnostic.** Vì đi qua chuẩn OpenAI, có thể đổi nhà cung cấp chỉ bằng `baseURL` + `model` (Gemini free → Groq free → OpenRouter free → OpenAI trả phí) mà **không sửa logic**.
4. **Hybrid + Fallback.** Luồng chính bằng Vision LLM (chính xác, hiểu ngữ cảnh). Khi hết quota / cần offline / cần riêng tư → tụt xuống Tesseract.js hoặc OCR.space, đổ text thô vào panel bôi chọn thủ công.
5. **$0 bền vững.** Nén ảnh phía client + cache theo hash + rate-limit để không bao giờ chạm trần free tier.

---

## 2. 🏗️ KIẾN TRÚC TỔNG THỂ (HYBRID 3 TẦNG)

```
        ┌─────────────────────────── CLIENT (Next.js) ───────────────────────────┐
        │  TẦNG 0 — Tiền xử lý ảnh                                                 │
        │  Kéo-thả ảnh → nén grayscale, resize ≤1600px (browser-image-compression)│
        └───────────────────────────────────┬─────────────────────────────────────┘
                                            │ multipart/form-data (ảnh đã nén)
                                            ▼
        ┌─────────────────────── BACKEND  POST /api/ocr/extract ───────────────────┐
        │  1) Hash ảnh (SHA-256) → check OcrCache ── HIT ──► trả JSON ngay (0 token) │
        │  2) MISS → TẦNG 1: Vision LLM (Gemini 2.0 Flash qua openai SDK, JSON mode) │
        │         └─ Lỗi/429/hết quota ─► TẦNG 2: Tesseract.js / OCR.space (text thô)│
        │  3) Validate + chuẩn hóa (dedupe, lowercase, lọc rác)                      │
        │  4) Lưu OcrCache (chỉ cấu trúc tiếng Anh)                                  │
        └───────────────────────────────────┬─────────────────────────────────────┘
                                            │ { vocabularies:[...], sentences:[...] }
                                            ▼
        ┌──────────────────── FE: Form điền sẵn / Panel bôi chọn ──────────────────┐
        │  GV soát & sửa → bấm "Giao bài tập"                                       │
        └───────────────────────────────────┬─────────────────────────────────────┘
                                            │ word + sentence (tiếng Anh)
                                            ▼
        ┌─────────── PIPELINE GAME (đã có sẵn — KHÔNG làm lại trong OCR) ───────────┐
        │  dictionaryapi.dev → IPA + audio + định nghĩa                             │
        │  MyMemory          → nghĩa tiếng Việt (cache TranslationCache)            │
        │  Datamuse          → từ nhiễu (lazy, lúc HS chơi)                         │
        │  → lưu DictionaryCache → sinh 3 game                                      │
        └──────────────────────────────────────────────────────────────────────────┘
```

**Điểm mấu chốt:** mũi tên cuối cùng chỉ truyền **tiếng Anh**. OCR không đụng tới dịch thuật/audio → không trùng MyMemory, không tốn ký tự quota dịch của tầng game.

---

## 3. 📊 SO SÁNH ENGINE (CẬP NHẬT)

| Tiêu chí | **Gemini 2.0 Flash** (qua `openai` SDK) ⭐ | Tesseract.js (client) | OCR.space (cloud free) | OpenAI GPT-4o-mini (vision) |
| :--- | :--- | :--- | :--- | :--- |
| **Chi phí** | 🟢 $0 — free tier 15 RPM / 1.500 RPD | 🟢 $0 không giới hạn | 🟢 $0 — 25k req/tháng | 🔴 ~$0.15/1M token (trả phí) |
| **Độ chính xác** | 🟢 Rất cao, đọc cả chữ viết tay, hiểu bố cục | 🟡 TB, kém với chữ mờ/viết tay | 🟢 Tốt với chữ in | 🟢 Rất cao |
| **Phân tách Word/Sentence** | 🟢 Có (LLM tự cấu trúc) | 🔴 Text thô | 🔴 Text thô | 🟢 Có |
| **Thêm dependency?** | 🟢 Không — dùng lại `openai` đã cài | 🟡 Cần `tesseract.js` (~ WASM) | 🟢 Không (REST) | 🟢 Không |
| **Vai trò trong dự án** | **Luồng chính** | **Fallback offline** | **Fallback cloud** | Dự phòng nếu cần SLA |

> **Quyết định:** **Gemini 2.0 Flash đi qua `openai` SDK** làm luồng chính (chính xác + $0 + 0 dependency mới). **Tesseract.js / OCR.space** làm fallback khi hết quota hoặc cần xử lý offline/riêng tư.

### Vì sao gọi Gemini qua `openai` SDK?
Google cung cấp **endpoint tương thích OpenAI**:
```
https://generativelanguage.googleapis.com/v1beta/openai/
```
Nhờ đó ta giữ nguyên `openai` SDK đã có trong `package.json`, không cài thêm gì, và nếu sau này muốn đổi sang Groq/OpenRouter/OpenAI thật thì chỉ đổi `baseURL` + `model`.

---

## 4. 🤝 HỢP ĐỒNG DỮ LIỆU (DATA CONTRACT)

OCR trả về **JSON tiếng Anh thuần** (đây là output chuẩn của backend):

```json
{
  "success": true,
  "engine": "gemini-2.0-flash",
  "cached": false,
  "data": {
    "vocabularies": [
      { "word": "environment", "type": "n", "meaningDraft": "môi trường" },
      { "word": "recycle",     "type": "v", "meaningDraft": "tái chế" }
    ],
    "sentences": [
      { "sentence": "We should protect the environment." },
      { "sentence": "How often do you recycle plastic bottles?" }
    ]
  }
}
```

- `word`: tiếng Anh, **lowercase, base form**, đã khử trùng lặp.
- `type`: loại từ thô (`n|v|adj|adv|phrase`) — chỉ để gợi ý UI; loại từ **chuẩn** sẽ do dictionaryapi.dev quyết định ở tầng game.
- `meaningDraft`: **nghĩa VN nháp** do LLM đoán, để fill UI **ngay lập tức**. Nghĩa **chính thức** vẫn lấy từ MyMemory (cache) ở tầng game. → vừa có UX tức thì, vừa không trùng nguồn sự thật.
- `sentence`: câu tiếng Anh nguyên văn; **không** kèm bản dịch (dịch thuộc tầng game).

### Khớp với FE hiện tại (định dạng dòng)
`TeacherHomework.jsx` đang dùng textarea dạng dòng. Cung cấp 2 helper chuyển đổi để **không phải viết lại FE ngay**:

```js
// JSON  →  textarea (định dạng dòng mà FE đang dùng)
export const toVocabLines = (vocabularies) =>
  vocabularies.map(v => `${v.word} (${v.type}) - ${v.meaningDraft ?? ''}`.trim()).join('\n');

export const toSentenceLines = (sentences) =>
  sentences.map(s => s.sentence).join('\n');
```

> **Khuyến nghị:** về lâu dài nâng FE để giữ luôn mảng object (giàu dữ liệu hơn dòng text). Nhưng 2 helper trên cho phép tích hợp ngay mà không vỡ luồng cũ.

---

## 5. 🧠 SYSTEM PROMPT (JSON MODE)

Khi đã bật JSON mode, prompt gọn và chắc hơn — không cần năn nỉ "đừng bọc markdown":

```text
You are an OCR + extraction engine for an English-learning app (Vietnamese primary/high-school context).

From the IMAGE, do two things:
1) OCR the English text accurately; fix obvious OCR typos.
2) Extract teaching material:
   - "vocabularies": key English words. For each: word (lowercase base form),
     type (one of: n, v, adj, adv, phrase), meaningDraft (short Vietnamese gloss).
   - "sentences": full English example sentences found in the image (verbatim, trimmed).

Constraints:
- English only for "word" and "sentence". Do NOT translate sentences.
- Deduplicate words. Skip page numbers, exercise codes, and non-English noise.
- If the image has no usable English, return empty arrays.

Return a JSON object exactly matching this shape:
{ "vocabularies": [ { "word": "", "type": "", "meaningDraft": "" } ],
  "sentences":     [ { "sentence": "" } ] }
```

---

## 6. 💾 DATABASE — BẢNG CACHE OCR

Thêm vào `prisma/schema.prisma`. Lưu **theo hash ảnh**, chỉ giữ cấu trúc tiếng Anh:

```prisma
model OcrCache {
  id            String   @id @default(cuid())
  imageHash     String   @unique            // SHA-256 của buffer ảnh (sau nén)
  engine        String                       // "gemini-2.0-flash" | "tesseract" | "ocrspace"
  structuredData Json                        // { vocabularies:[...], sentences:[...] } — chỉ tiếng Anh
  hitCount      Int      @default(0)         // tiện thống kê tái dùng
  createdAt     DateTime @default(now())

  @@index([createdAt])
}
```

> **Không** lưu ảnh gốc, **không** lưu bản dịch ở đây. Bản dịch/IPA/audio sống trong `DictionaryCache`/`TranslationCache` (xem `GAME_GENERATION_OPTIMIZATION.md`) — tách bạch để mỗi cache có đúng một nhiệm vụ.

Chạy: `npm run db:migrate` (alias của `prisma migrate dev`).

---

## 7. 🔌 BACKEND — TRIỂN KHAI

Cài cấu hình env (`.env.example` đã có chỗ, chỉ thêm dòng Gemini):

```dotenv
# OCR / Vision LLM (đi qua openai SDK, endpoint OpenAI-compatible của Gemini)
GEMINI_API_KEY=
LLM_OCR_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_OCR_MODEL=gemini-2.0-flash
OCR_DAILY_LIMIT=20
# (đã có sẵn) OCR_API_KEY=   # dùng cho fallback OCR.space nếu cần
```

Cập nhật `src/config/env.js`:

```js
module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  openaiApiKey: process.env.OPENAI_API_KEY,
  ocrApiKey: process.env.OCR_API_KEY,
  // OCR LLM
  geminiApiKey: process.env.GEMINI_API_KEY,
  llmOcrBaseUrl: process.env.LLM_OCR_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
  llmOcrModel: process.env.LLM_OCR_MODEL || 'gemini-2.0-flash',
  ocrDailyLimit: Number(process.env.OCR_DAILY_LIMIT || 20),
};
```

### `src/modules/ocr/ocr.service.js` (thay thế stub hiện tại)

```js
const crypto = require('crypto');
const OpenAI = require('openai');
const prisma = require('../../config/database');
const env = require('../../config/env');

// Tái dùng chính openai SDK đã có — chỉ đổi baseURL sang endpoint Gemini OpenAI-compatible.
const llm = new OpenAI({
  apiKey: env.geminiApiKey,
  baseURL: env.llmOcrBaseUrl,
});

const SYSTEM_PROMPT = `You are an OCR + extraction engine for an English-learning app (Vietnamese primary/high-school context).
From the IMAGE: (1) OCR the English text accurately and fix obvious OCR typos; (2) extract teaching material.
- "vocabularies": key English words. Each: word (lowercase base form), type (n|v|adj|adv|phrase), meaningDraft (short Vietnamese gloss).
- "sentences": full English example sentences found in the image (verbatim, trimmed). Do NOT translate sentences.
English only for word/sentence. Deduplicate words. Skip page numbers, exercise codes and non-English noise.
If no usable English, return empty arrays.
Return JSON exactly: { "vocabularies":[{"word":"","type":"","meaningDraft":""}], "sentences":[{"sentence":""}] }`;

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

// ---- Chuẩn hóa & validate (xem mục 8) ----
const VALID_TYPES = new Set(['n', 'v', 'adj', 'adv', 'phrase']);

const normalize = (raw) => {
  const seen = new Set();
  const vocabularies = (raw?.vocabularies ?? [])
    .map((v) => ({
      word: String(v.word || '').trim().toLowerCase(),
      type: VALID_TYPES.has(v.type) ? v.type : 'n',
      meaningDraft: String(v.meaningDraft || '').trim(),
    }))
    .filter((v) => v.word && /[a-z]/.test(v.word) && !seen.has(v.word) && seen.add(v.word));

  const sentences = (raw?.sentences ?? [])
    .map((s) => ({ sentence: String(s.sentence || '').trim() }))
    .filter((s) => s.sentence.split(/\s+/).length >= 2); // bỏ "câu" 1 từ

  return { vocabularies, sentences };
};

const callVisionLLM = async (fileBuffer, mimeType) => {
  const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  const completion = await llm.chat.completions.create({
    model: env.llmOcrModel,
    response_format: { type: 'json_object' }, // JSON mode — không cần parse markdown
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract vocabularies and sentences from this image.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  return JSON.parse(completion.choices[0].message.content);
};

/**
 * OCR + trích xuất tiếng Anh từ ảnh.
 * @returns { engine, cached, data: { vocabularies, sentences } }
 */
const extractFromImage = async (fileBuffer, mimeType) => {
  const imageHash = sha256(fileBuffer);

  // 1) Cache theo hash
  const cached = await prisma.ocrCache.findUnique({ where: { imageHash } });
  if (cached) {
    await prisma.ocrCache.update({ where: { imageHash }, data: { hitCount: { increment: 1 } } });
    return { engine: cached.engine, cached: true, data: cached.structuredData };
  }

  // 2) Vision LLM (có retry nhẹ cho 429)
  let data;
  let engine = env.llmOcrModel;
  try {
    const raw = await withRetry(() => callVisionLLM(fileBuffer, mimeType));
    data = normalize(raw);
  } catch (err) {
    console.error('[OCR] Vision LLM lỗi, sẽ trả tín hiệu fallback:', err?.message);
    // Báo cho controller để chuyển sang luồng fallback (Tesseract/OCR.space) ở client
    const e = new Error('LLM_OCR_UNAVAILABLE');
    e.code = 'LLM_OCR_UNAVAILABLE';
    throw e;
  }

  // 3) Lưu cache (chỉ cấu trúc tiếng Anh)
  await prisma.ocrCache.create({ data: { imageHash, engine, structuredData: data } });

  return { engine, cached: false, data };
};

// Retry tối giản cho lỗi tạm thời / 429
const withRetry = async (fn, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const retriable = status === 429 || (status >= 500 && status < 600);
      if (!retriable || i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 800 * (i + 1))); // backoff tuyến tính
    }
  }
};

module.exports = { extractFromImage, sha256, normalize };
```

### `src/modules/ocr/ocr.controller.js`

```js
const service = require('./ocr.service');
const { ok, fail } = require('../../utils/response');

const extract = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 'Thiếu file ảnh (field "image").', 400);
    const result = await service.extractFromImage(req.file.buffer, req.file.mimetype);
    ok(res, result);
  } catch (err) {
    if (err.code === 'LLM_OCR_UNAVAILABLE') {
      // 503 + cờ fallback để FE chủ động chạy Tesseract.js client-side
      return res.status(503).json({ success: false, error: 'OCR tự động tạm bận', fallback: 'client' });
    }
    next(err);
  }
};

module.exports = { extract };
```

### `src/modules/ocr/ocr.routes.js` (dùng `multer` đã có sẵn)

```js
const router = require('express').Router();
const multer = require('multer');
const controller = require('./ocr.controller');
const auth = require('../../middleware/auth');
const { ocrRateLimit } = require('./ocr.ratelimit');

const upload = multer({
  storage: multer.memoryStorage(), // giữ buffer để hash + gửi LLM, không ghi đĩa
  limits: { fileSize: 8 * 1024 * 1024 }, // ≤ 8MB (ảnh đã nén ở client còn nhỏ hơn nhiều)
  fileFilter: (_req, file, cb) => {
    const okType = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
    cb(okType ? null : new Error('Định dạng ảnh không hỗ trợ'), okType);
  },
});

router.post('/extract', auth, ocrRateLimit, upload.single('image'), controller.extract);

module.exports = router;
```

---

## 8. 🧹 VALIDATE & CHUẨN HÓA (CHỐNG RÁC)

Hàm `normalize()` ở trên đã làm các việc tối thiểu **bắt buộc** trước khi tin LLM:

- **Khử trùng lặp** từ vựng (Set theo `word`).
- **Lowercase + base form**, loại token không chứa chữ cái Latin (số trang, mã bài "3a", ký tự rác).
- **Ép `type`** về tập hợp lệ, mặc định `n` nếu lạ.
- **Bỏ "câu" < 2 từ** (thường là rác OCR).

Mở rộng khuyến nghị (tùy nhu cầu): lọc stopword khỏi danh sách từ vựng (`the, a, is, of...`), giới hạn số lượng (vd ≤ 60 từ / ảnh) để tránh prompt injection từ ảnh chứa nhiều text, và kiểm tra `sentence` không dài bất thường (> 300 ký tự → cắt).

---

## 9. 🔁 FALLBACK ENGINE (KHI HẾT QUOTA / OFFLINE)

Khi backend trả `503 { fallback: 'client' }`, FE chạy **Tesseract.js** ngay trên trình duyệt (không tốn quota, không gửi ảnh đi đâu) → đổ **text thô** vào **Panel bôi chọn**. Đây cũng là chế độ ưu tiên khi tài liệu nhạy cảm.

```jsx
// FE: fallback OCR thuần client bằng tesseract.js (cài: npm i tesseract.js)
import Tesseract from 'tesseract.js';

export async function ocrClientFallback(file, onProgress) {
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m) => m.status === 'recognizing text' && onProgress?.(m.progress),
  });
  return data.text; // text thô → hiển thị ở InteractiveOcrPanel để GV bôi chọn
}
```

> **OCR.space** (server-side, `OCR_API_KEY` đã có sẵn trong env) là phương án fallback cloud thay thế nếu không muốn tải WASM Tesseract về client. Cùng cho ra **text thô** → cùng đổ vào panel bôi chọn.

### Panel bôi chọn tương tác (giữ từ v1, đã gọn lại)

```jsx
import React, { useRef, useState } from 'react';

export default function InteractiveOcrPanel({ rawOcrText, onAssignVocab, onAssignSentence }) {
  const [selectedText, setSelectedText] = useState('');
  const [tip, setTip] = useState({ top: 0, left: 0, show: false });
  const boxRef = useRef(null);

  const onMouseUp = () => {
    const text = window.getSelection().toString().trim();
    if (!text) return setTip((p) => ({ ...p, show: false }));
    const r = window.getSelection().getRangeAt(0).getBoundingClientRect();
    const b = boxRef.current.getBoundingClientRect();
    setSelectedText(text);
    setTip({ top: r.top - b.top - 40, left: r.left - b.left + r.width / 2 - 100, show: true });
  };

  const assign = (type) => {
    (type === 'vocab' ? onAssignVocab : onAssignSentence)(selectedText);
    setTip((p) => ({ ...p, show: false }));
    window.getSelection().removeAllRanges();
  };

  return (
    <div ref={boxRef} onMouseUp={onMouseUp}
         className="relative border rounded-lg p-4 bg-slate-900 text-slate-100">
      <h3 className="text-sm font-bold text-indigo-400 mb-2">📄 VĂN BẢN QUÉT (BÔI ĐỂ CHỌN NHANH)</h3>
      <p className="whitespace-pre-line leading-relaxed text-sm select-text selection:bg-indigo-500">
        {rawOcrText || 'Chưa có ảnh nào được quét.'}
      </p>
      {tip.show && (
        <div className="absolute z-50 flex gap-2 bg-slate-800 border border-slate-700 rounded-md p-1"
             style={{ top: tip.top, left: tip.left }}>
          <button onClick={() => assign('vocab')}
                  className="px-2 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 rounded">➕ Từ vựng</button>
          <button onClick={() => assign('sentence')}
                  className="px-2 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 rounded">➕ Mẫu câu</button>
        </div>
      )}
    </div>
  );
}
```

---

## 10. 🖼️ TẦNG 0 — TIỀN XỬ LÝ ẢNH (CLIENT)

Nén **trước khi upload**: vừa nhanh, vừa giảm token LLM, vừa tăng độ chính xác OCR.

```js
// npm i browser-image-compression
import imageCompression from 'browser-image-compression';

export async function preprocessForOcr(file) {
  return imageCompression(file, {
    maxWidthOrHeight: 1600,   // đủ nét cho OCR, đủ nhẹ để upload nhanh
    maxSizeMB: 1,
    useWebWorker: true,
    fileType: 'image/webp',   // webp nhẹ, Gemini đọc tốt
  });
}
```

> Mẹo tăng tương phản: với chữ in mờ, convert grayscale + tăng contrast bằng canvas trước khi nén. Không bắt buộc cho luồng LLM (Gemini chịu nhiễu tốt) nhưng giúp **Tesseract** fallback chính xác hơn rõ rệt.

### Nối vào `TeacherHomework.jsx` (thay phần mock hiện tại)

```js
// Thay handleFileUpload mock bằng luồng thật:
const handleFileUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setIsOcrProcessing(true);
  showToast('Đang nén ảnh & phân tích OCR...', 'warning');
  try {
    const compressed = await preprocessForOcr(file);
    const form = new FormData();
    form.append('image', compressed, 'scan.webp');

    const res = await fetch('/api/ocr/extract', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (res.status === 503) {
      // Fallback: OCR ngay tại client
      const text = await ocrClientFallback(compressed, (p) => setOcrProgress(p));
      setOcrResultText(text); // → InteractiveOcrPanel để GV bôi chọn
      showToast('Đã quét bằng chế độ dự phòng (offline).', 'info');
      return;
    }

    const { data } = await res.json();          // { engine, cached, data:{...} }
    setVocabInput(toVocabLines(data.data.vocabularies));     // đổ vào textarea sẵn có
    setSentenceInput(toSentenceLines(data.data.sentences));
    showToast(data.cached ? 'Lấy từ cache (0 token)!' : 'OCR tự động thành công!', 'success');
  } catch (err) {
    showToast('OCR thất bại, vui lòng thử lại.', 'error');
  } finally {
    setIsOcrProcessing(false);
  }
};
```

---

## 11. 💰 TỐI ƯU CHI PHÍ & RATE LIMITING

1. **Cache theo hash ảnh** (`OcrCache`): GV quét lại đề cũ → trả ngay, **0 token**. `hitCount` cho biết cache "đáng giá" thế nào.
2. **Nén ảnh client** (mục 10): ảnh ≤ ~1MB → ít token vision hơn, upload nhanh hơn.
3. **Rate-limit theo người dùng** để không chạm trần Gemini free (15 RPM / 1.500 RPD):

```js
// src/modules/ocr/ocr.ratelimit.js — đếm theo ngày, in-memory (đủ cho giai đoạn đầu)
const env = require('../../config/env');
const { fail } = require('../../utils/response');

const counter = new Map(); // userId -> { date, count }

const ocrRateLimit = (req, res, next) => {
  const today = new Date().toISOString().slice(0, 10);
  const key = req.user?.id || req.ip;
  const rec = counter.get(key);
  if (!rec || rec.date !== today) counter.set(key, { date: today, count: 1 });
  else if (rec.count >= env.ocrDailyLimit) return fail(res, `Đã đạt giới hạn ${env.ocrDailyLimit} ảnh/ngày.`, 429);
  else rec.count += 1;
  next();
};

module.exports = { ocrRateLimit };
```

> Khi lên nhiều instance, thay `Map` in-memory bằng Redis hoặc 1 bảng `OcrUsage` trong Postgres (cùng pattern, chỉ đổi nơi lưu đếm).

---

## 12. 🔐 BẢO MẬT & QUYỀN RIÊNG TƯ

- **Không lưu ảnh gốc** ở server (memoryStorage + chỉ giữ hash). Giảm rủi ro lộ dữ liệu.
- **Free tier Gemini (AI Studio)** có thể dùng dữ liệu để cải thiện model. Tài liệu là **trang SGK/đề công khai** nên rủi ro thấp; nếu cần tuyệt đối riêng tư → bật chế độ **fallback Tesseract.js** (xử lý 100% trên máy GV) hoặc nâng lên Gemini API có trả phí (không dùng data để train).
- **Chặn ở route**: bắt buộc `auth`, giới hạn `mimetype` + `fileSize`, rate-limit. Cân nhắc giới hạn số từ/câu để chống "prompt injection qua ảnh".
- **Validate đầu ra LLM** (mục 8) trước khi tin/ghi DB.

---

## 13. ✅ CHECKLIST TRIỂN KHAI

- [ ] `prisma/schema.prisma`: thêm model `OcrCache` → `npm run db:migrate`.
- [ ] `.env`: thêm `GEMINI_API_KEY`, `LLM_OCR_BASE_URL`, `LLM_OCR_MODEL`, `OCR_DAILY_LIMIT`.
- [ ] `src/config/env.js`: export 4 biến mới.
- [ ] `src/modules/ocr/ocr.service.js`: thay stub bằng `extractFromImage` (Vision LLM + cache + normalize + retry).
- [ ] `src/modules/ocr/ocr.controller.js`: đổi `getAll` → `extract` (xử lý cờ fallback 503).
- [ ] `src/modules/ocr/ocr.routes.js`: route `POST /extract` + `multer` memoryStorage + rate-limit.
- [ ] FE: `preprocessForOcr` (browser-image-compression) + `toVocabLines/toSentenceLines` + nối vào `handleFileUpload` thật.
- [ ] FE: `InteractiveOcrPanel` + `ocrClientFallback` (tesseract.js) cho luồng 503.
- [ ] Kiểm thử: ảnh đẹp (LLM), ảnh mờ/viết tay (chất lượng), quét lại (cache hit), vượt 20 ảnh/ngày (429), ngắt mạng Gemini (fallback client).

---

### TÓM TẮT 1 DÒNG
> **OCR chỉ trích tiếng Anh** bằng **Gemini 2.0 Flash gọi qua `openai` SDK sẵn có** (JSON mode, $0, 0 dependency mới), **cache theo hash ảnh**, **fallback Tesseract.js** khi hết quota — còn dịch nghĩa/IPA/audio/từ nhiễu để **pipeline game lo**, tránh trùng lặp và tối đa khả năng cache.
