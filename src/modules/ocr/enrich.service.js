const https = require('https');
const env = require('../../config/env');

/**
 * ENRICH SERVICE — "làm giàu" Từ vựng & Mẫu câu (sau khi OCR/nhập tay) thành dữ liệu
 * đủ để sinh 3 game, theo đúng GAME_GENERATION_OPTIMIZATION.md.
 *
 * Mỗi TỪ cần: phonetic, audioUrl, partOfSpeech, definitionEn, exampleSentence (dictionaryapi.dev)
 *             + meaningVi (ưu tiên nghĩa OCR, thiếu thì MyMemory)
 *             + distractors[] (Datamuse) + distractorsVi[] (MyMemory)  ← tùy chọn (Tầng 2)
 * Mỗi CÂU cần: translation (ưu tiên bản dịch OCR, thiếu thì MyMemory)
 *
 * Tất cả API đều FREE & không key. Có cache in-memory (mô phỏng DictionaryCache/TranslationCache).
 */

// Mạng máy có HTTPS-inspection → dùng lại cờ insecure như OCR để gọi các API ngoài.
const agent = env.ocrInsecureTls ? new https.Agent({ rejectUnauthorized: false }) : undefined;

/** GET JSON tối giản qua https (TLS-aware). 404 → null. */
const httpGetJson = (url, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { agent, timeout: timeoutMs, headers: { 'User-Agent': 'StudyEnglish/1.0 (+ocr-enrich)' } }, (res) => {
      const { statusCode } = res;
      if (statusCode === 404) { res.resume(); return resolve(null); }
      if (statusCode >= 400) { res.resume(); const e = new Error(`HTTP ${statusCode}`); e.status = statusCode; return reject(e); }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (err) { reject(err); } });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });

// ── Cache in-memory (TTL dùng chung với OCR cache) ──
const mkCache = () => new Map(); // key -> { value, expireAt }
const dictCache = mkCache();
const transCache = mkCache();
const distractorCache = mkCache();
const getC = (c, k) => { const h = c.get(k); if (!h) return undefined; if (h.expireAt <= Date.now()) { c.delete(k); return undefined; } return h.value; };
const setC = (c, k, v) => { if (c.size >= env.ocrCacheMax) c.delete(c.keys().next().value); c.set(k, { value: v, expireAt: Date.now() + env.ocrCacheTtlMs }); };

/** Chạy song song có giới hạn (tránh hammer API free). */
const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
};

// ── 1) dictionaryapi.dev: phonetic, audio, pos, definition, example ──
const fetchDictionary = async (word) => {
  const cached = getC(dictCache, word);
  if (cached) return cached;
  let result = { phonetic: '', audioUrl: '', partOfSpeech: '', definitionEn: '', exampleSentence: '' };
  try {
    const data = await httpGetJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    const entry = Array.isArray(data) ? data[0] : null;
    if (entry) {
      // Chọn phiên âm ĐẦY ĐỦ nhất (entry.phonetic đôi khi cụt, vd "/-mɪnt/").
      const phonetic = [entry.phonetic, ...(entry.phonetics || []).map((p) => p.text)]
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)[0] || '';
      const audioUrl = (entry.phonetics || []).find((p) => p.audio)?.audio || '';
      const m0 = (entry.meanings || [])[0] || {};
      const def0 = (m0.definitions || [])[0] || {};
      let exampleSentence = def0.example || '';
      if (!exampleSentence) {
        for (const m of entry.meanings || []) { for (const d of m.definitions || []) { if (d.example) { exampleSentence = d.example; break; } } if (exampleSentence) break; }
      }
      result = { phonetic, audioUrl, partOfSpeech: m0.partOfSpeech || '', definitionEn: def0.definition || '', exampleSentence };
    }
  } catch (err) {
    console.error(`[ENRICH] dictionary "${word}":`, err.message);
  }
  setC(dictCache, word, result);
  return result;
};

// ── 2) MyMemory: dịch EN→VI ──
const translateEnToVi = async (text) => {
  const key = text.trim().toLowerCase();
  if (!key) return '';
  const cached = getC(transCache, key);
  if (cached !== undefined) return cached;
  let vi = '';
  try {
    const de = env.myMemoryEmail ? `&de=${encodeURIComponent(env.myMemoryEmail)}` : '';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi${de}`;
    const data = await httpGetJson(url);
    vi = data?.responseData?.translatedText || '';
    // MyMemory đôi khi trả cảnh báo quota trong translatedText → bỏ nếu chứa dấu hiệu
    if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(vi)) vi = '';
  } catch (err) {
    console.error(`[ENRICH] translate "${text.slice(0, 30)}":`, err.message);
  }
  setC(transCache, key, vi);
  return vi;
};

// ── 3) NGÂN HÀNG TỪ DỄ (bù khi bài ít từ anh em) ──
// An toàn cho trẻ + đúng cấp độ + có nghĩa VN sẵn → KHÔNG gọi API, KHÔNG từ bậy/hiếm.
// (Datamuse `ml=` cho ra từ học thuật/bậy như dog→god/hell nên KHÔNG dùng cho cấp thấp.)
const EASY_BANK = {
  n: [['cat', 'con mèo'], ['dog', 'con chó'], ['bird', 'con chim'], ['fish', 'con cá'], ['book', 'quyển sách'], ['ball', 'quả bóng'], ['pen', 'cây bút'], ['table', 'cái bàn'], ['chair', 'cái ghế'], ['house', 'ngôi nhà'], ['tree', 'cái cây'], ['apple', 'quả táo'], ['school', 'trường học'], ['friend', 'người bạn'], ['hand', 'bàn tay'], ['door', 'cánh cửa'], ['car', 'xe hơi'], ['bag', 'cái túi'], ['milk', 'sữa'], ['box', 'cái hộp']],
  v: [['run', 'chạy'], ['jump', 'nhảy'], ['eat', 'ăn'], ['drink', 'uống'], ['play', 'chơi'], ['read', 'đọc'], ['write', 'viết'], ['sing', 'hát'], ['walk', 'đi bộ'], ['swim', 'bơi'], ['open', 'mở'], ['close', 'đóng'], ['look', 'nhìn'], ['listen', 'nghe'], ['sleep', 'ngủ'], ['go', 'đi'], ['come', 'đến'], ['see', 'thấy'], ['like', 'thích'], ['help', 'giúp']],
  adj: [['big', 'to'], ['small', 'nhỏ'], ['happy', 'vui'], ['sad', 'buồn'], ['hot', 'nóng'], ['cold', 'lạnh'], ['new', 'mới'], ['old', 'cũ'], ['good', 'tốt'], ['bad', 'xấu'], ['fast', 'nhanh'], ['slow', 'chậm'], ['tall', 'cao'], ['short', 'ngắn'], ['long', 'dài'], ['nice', 'đẹp'], ['red', 'màu đỏ'], ['blue', 'màu xanh'], ['green', 'màu xanh lá'], ['yellow', 'màu vàng']],
  adv: [['quickly', 'nhanh chóng'], ['slowly', 'chậm rãi'], ['well', 'tốt'], ['here', 'ở đây'], ['there', 'ở đó'], ['now', 'bây giờ'], ['today', 'hôm nay'], ['always', 'luôn luôn'], ['never', 'không bao giờ'], ['often', 'thường xuyên']],
};

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/**
 * Tạo từ nhiễu DỄ cho cả bộ từ (Tầng 2 — gọi LAZY, KHÔNG cần lúc load file).
 * 1) Ưu tiên CHÍNH các từ khác trong bài (cùng cấp độ/chủ đề; distractorsVi lấy nghĩa sẵn — 0 API).
 * 2) Thiếu → bù bằng ngân hàng từ dễ (cùng loại từ; an toàn cho trẻ; 0 API).
 * @param {Array<{word,type?,meaning?}>} vocabularies
 * @param {{max?:number}} opts
 */
const addDistractors = async (vocabularies = [], opts = {}) => {
  const max = opts.max || 8;
  const list = vocabularies.map((v) => ({ ...v, word: String(v.word || '').trim().toLowerCase() }));

  return list.map((v) => {
    if (!v.word) return v;
    const used = new Set([v.word]);
    const distractors = [];
    const distractorsVi = [];
    const push = (w, vi) => { const k = String(w).toLowerCase(); if (!w || used.has(k) || distractors.length >= max) return; used.add(k); distractors.push(k); distractorsVi.push(vi || ''); };

    // 1) Từ anh em trong bài (ưu tiên cùng type).
    const others = list.filter((x) => x.word && x.word !== v.word);
    const sameType = others.filter((x) => x.type && v.type && x.type === v.type);
    shuffle(sameType.length >= 3 ? sameType : others).forEach((s) => push(s.word, s.meaning));

    // 2) Bù từ ngân hàng dễ cùng loại từ.
    if (distractors.length < max) {
      const bank = EASY_BANK[v.type] || EASY_BANK.n;
      shuffle(bank).forEach(([w, vi]) => push(w, vi));
    }
    return { ...v, distractors, distractorsVi };
  });
};

// ── Làm giàu 1 TỪ (Tầng 1: dictionary + nghĩa). KHÔNG kèm distractors (đã tách Tầng 2). ──
const enrichVocabulary = async (v) => {
  const word = String(v.word || '').trim().toLowerCase();
  if (!word) return v;

  const [dict, meaningViFallback] = await Promise.all([
    fetchDictionary(word),
    v.meaning ? Promise.resolve(v.meaning) : translateEnToVi(word), // ưu tiên nghĩa OCR
  ]);

  return {
    word,
    type: v.type || mapPos(dict.partOfSpeech),
    phonetic: v.phonetic || dict.phonetic || '',
    audioUrl: dict.audioUrl || '',
    partOfSpeech: dict.partOfSpeech || '',
    definitionEn: dict.definitionEn || '',
    exampleSentence: dict.exampleSentence || '',
    meaning: v.meaning || meaningViFallback || '',
  };
};

// dictionaryapi.dev partOfSpeech (noun/verb/...) → mã ngắn của app
const mapPos = (pos = '') => ({ noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv' }[pos.toLowerCase()] || 'n');

// ── Làm giàu 1 CÂU ──
const enrichSentence = async (s) => {
  const sentence = String(s.sentence || '').trim();
  if (!sentence) return s;
  const translation = s.translation || (await translateEnToVi(sentence));
  return { sentence, translation: translation || '' };
};

/**
 * Tầng 1: làm giàu cả bộ {vocabularies, sentences} — dictionary + nghĩa + dịch câu.
 * (KHÔNG kèm distractors; gọi addDistractors riêng ở Tầng 2.)
 */
const enrichAll = async (data) => {
  const vocabularies = await mapLimit(data?.vocabularies || [], 4, (v) => enrichVocabulary(v));
  const sentences = await mapLimit(data?.sentences || [], 4, (s) => enrichSentence(s));
  return { vocabularies, sentences };
};

module.exports = {
  enrichAll, enrichVocabulary, enrichSentence, addDistractors,
  fetchDictionary, translateEnToVi,
};
