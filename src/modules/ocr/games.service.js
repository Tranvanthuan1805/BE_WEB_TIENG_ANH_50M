const enrich = require('./enrich.service');

/**
 * GAMES SERVICE — biến nội dung GV (3 ô / dán đống) thành JSON đủ cho 3 game.
 *
 * Triết lý:
 *  - Parser KHOAN DUNG: GV không cần nhập đúng format. Tự bỏ số thứ tự/bullet, nhận nhiều
 *    dấu ngăn (- : = tab), tách dấu phẩy, đảo Việt-Anh, map loại từ (noun→n, danh từ→n…),
 *    dedupe, lọc rác. (Sai format quá nặng → dùng nút "AI dọn dẹp" /api/ocr/parse-text.)
 *  - Sinh game TẤT ĐỊNH, 0 API ngoài: từ nhiễu lấy từ `enrich.addDistractors`
 *    (từ anh em trong bài + EASY_BANK theo loại từ).
 *  - Dữ liệu cần API ngoài/Web API (audio TTS, phiên âm IPA, dịch chi tiết) → KHÔNG fetch ở
 *    đây mà CHÚ THÍCH nguồn trong `meta.apiNotes` + field `audio` (Web Speech API ở trình duyệt).
 *  - Theo KHỐI (grade): số đáp án + game bật + độ khó distractor.
 */

// ── Tiện ích ──
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const hasVietnamese = (s) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripLead = (line) => line.replace(/^\s*(?:\d+\s*[.)、]|[-*•·–])\s+/, '').trim();

const TYPE_MAP = {
  n: 'n', noun: 'n', 'danh từ': 'n', 'danh tu': 'n',
  v: 'v', verb: 'v', 'động từ': 'v', 'dong tu': 'v',
  adj: 'adj', adjective: 'adj', 'tính từ': 'adj', 'tinh tu': 'adj',
  adv: 'adv', adverb: 'adv', 'trạng từ': 'adv', 'trang tu': 'adv',
  phrase: 'phrase', 'cụm từ': 'phrase', 'cum tu': 'phrase', idiom: 'phrase',
};
const normType = (t, word) => {
  const key = String(t || '').trim().toLowerCase();
  if (TYPE_MAP[key]) return TYPE_MAP[key];
  if (word && word.includes(' ')) return 'phrase';
  return 'n';
};

// ── 1) Parser TỪ VỰNG (khoan dung) ──
const parseVocab = (text = '') => {
  const out = [];
  const warnings = [];
  const seen = new Set();
  String(text).split('\n').forEach((rawLine) => {
    const line0 = stripLead(rawLine);
    if (!line0) return;
    // tách nhiều từ trên 1 dòng nếu ngăn bằng dấu phẩy/; mà KHÔNG có dấu ngăn nghĩa
    const tokens = /[-–:=]/.test(line0) ? [line0] : line0.split(/[,;]+/);
    tokens.forEach((tok) => {
      const token = tok.trim();
      if (!token) return;
      // word (type) - meaning  | word - meaning | word
      const m = token.match(/^(.+?)\s*(?:\(([^)]*)\))?\s*(?:[-–:=]\s*(.+))?$/);
      if (!m) { warnings.push(token); return; }
      let word = (m[1] || '').trim();
      const typeRaw = m[2];
      let meaning = (m[3] || '').trim();
      // đảo Việt-Anh: nếu "word" là tiếng Việt còn "meaning" là tiếng Anh → hoán đổi
      if (meaning && hasVietnamese(word) && !hasVietnamese(meaning) && /[a-z]/i.test(meaning)) {
        [word, meaning] = [meaning, word];
      }
      const type = normType(typeRaw, word);
      const key = word.toLowerCase();
      if (!key || !/[a-z]/i.test(key) || seen.has(key)) {
        if (key && !/[a-z]/i.test(key)) warnings.push(token);
        return;
      }
      seen.add(key);
      out.push({ word: key, type, meaning });
    });
  });
  return { vocabularies: out, warnings };
};

// ── 2) Parser MẪU CÂU (khoan dung) ──
const parseSentences = (text = '') => {
  const out = [];
  const warnings = [];
  let lines = String(text).split('\n').map(stripLead).filter(Boolean);
  // Dán 1 đoạn dài không xuống dòng → tách theo .?!
  if (lines.length === 1 && lines[0].length > 120) {
    lines = lines[0].split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
  }
  const seen = new Set();
  lines.forEach((line) => {
    let sentence = line;
    let translation = '';
    // dòng song ngữ "I am seven - Tôi 7 tuổi"
    const bi = line.split(/\s+[-–=]\s+/);
    if (bi.length === 2) {
      const [a, b] = bi;
      if (!hasVietnamese(a) && hasVietnamese(b)) { sentence = a.trim(); translation = b.trim(); }
      else if (hasVietnamese(a) && !hasVietnamese(b)) { sentence = b.trim(); translation = a.trim(); }
    }
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length < 2 || !/[a-z]/i.test(sentence)) { warnings.push(line); return; }
    const key = sentence.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ sentence, translation });
  });
  return { sentences: out, warnings };
};

// ── 3) Parser TRẮC NGHIỆM (khoan dung) ──
const parseQuestions = (text = '') => {
  const out = [];
  const warnings = [];
  const raw = String(text).trim();
  if (!raw) return { questions: out, warnings };

  // tách block theo dòng trống; nếu không có dòng trống → tách theo "1." "2." đầu dòng
  let blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 1) {
    const byNum = raw.split(/\n(?=\s*\d+\s*[.)])/).map((b) => b.trim()).filter(Boolean);
    if (byNum.length > 1) blocks = byNum;
  }

  const OPT_PREFIX = /^[A-Fa-f]\s*[.)、．:\-]\s+/;       // "A." "B)" "C:" ...
  const stripPrefix = (l) => l.replace(/^[A-Fa-f]\s*[.)、．:\-]\s*/, '').trim();

  blocks.forEach((block) => {
    // 1) tách dòng đáp án ra trước
    let answer = '';
    const rest = [];
    block.split('\n').map((l) => l.trim()).filter(Boolean).forEach((line) => {
      const ans = line.match(/^(?:đáp án|dap an|answer|key|correct)\s*[:\-.]?\s*([A-Fa-f])\b/i);
      if (ans) { answer = ans[1].toUpperCase(); return; }
      rest.push(line);
    });
    if (rest.length < 2) { warnings.push(block.slice(0, 60)); return; }

    // 2) tách câu hỏi / lựa chọn — chấp nhận cả khi lựa chọn KHÔNG có tiền tố A./B.
    const prefixIdx = rest.findIndex((l) => OPT_PREFIX.test(l));
    let question;
    let options;
    if (prefixIdx >= 1) {
      question = rest.slice(0, prefixIdx).map(stripLead).join(' ').trim();
      options = rest.slice(prefixIdx).map(stripPrefix);
    } else {
      question = stripLead(rest[0]);          // dòng đầu là câu hỏi
      options = rest.slice(1).map(stripPrefix); // còn lại là lựa chọn
    }
    options = options.filter(Boolean).slice(0, 6);
    if (!question || options.length < 2) { warnings.push(block.slice(0, 60)); return; }
    if (answer && answer.charCodeAt(0) - 65 >= options.length) answer = ''; // đáp án ngoài phạm vi
    out.push({ question, options, answer });
  });
  return { questions: out, warnings };
};

// ── Cấu hình theo KHỐI (trình độ) ──
const gradeConfig = (grade) => {
  const g = Number(grade) || 0;
  if (g >= 1 && g <= 2) return { grade: g, optionsCount: 3, games: [1, 2], distractorLevel: 'easy' };
  if (g >= 3 && g <= 5) return { grade: g, optionsCount: 4, games: [1, 2, 3], distractorLevel: 'easy' };
  if (g >= 6 && g <= 9) return { grade: g, optionsCount: 4, games: [1, 2, 3], distractorLevel: 'medium' };
  if (g >= 10) return { grade: g, optionsCount: 4, games: [1, 2, 3], distractorLevel: 'hard' };
  return { grade: 0, optionsCount: 4, games: [1, 2, 3], distractorLevel: 'easy' }; // chưa rõ khối
};

const audioNote = (text) => ({ provider: 'Web Speech API', lang: 'en-US', text });

// Lớp đóng "số đếm" — distractor cùng lớp này gây "nhiều đáp án đúng" khi điền vào chỗ trống.
const NUMBER_WORDS = new Set(['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million']);
const isNumberWord = (w) => NUMBER_WORDS.has(String(w || '').toLowerCase()) || /^\d+$/.test(String(w || ''));
const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const MIN_BLANK_WORDS = 4; // câu < 4 từ (vd "I am seven.") → blank quá mơ hồ → bỏ

// ── Game 1: Flashcard chọn nghĩa (EN → 4 nghĩa VN) ──
const buildGame1 = (enriched, cfg) => {
  const items = [];
  const needTranslate = [];
  enriched.forEach((v, idx) => {
    if (!v.meaning) { needTranslate.push(v.word); return; } // cần MyMemory → để FE/Tầng1 bổ sung
    const pool = (v.distractorsVi || []).filter((d) => d && d !== v.meaning);
    const distractors = shuffle(pool).slice(0, cfg.optionsCount - 1);
    const options = shuffle([v.meaning, ...distractors]);
    items.push({
      id: `g1_${idx + 1}`,
      word: v.word,
      phonetic: v.phonetic || '',       // điền từ dictionaryapi.dev khi bật enrich
      audioUrl: v.audioUrl || '',       // mp3 từ dictionaryapi.dev (nếu có)
      meaning: v.meaning,
      options,
      answer: options.indexOf(v.meaning),
      audio: audioNote(v.word),         // fallback Web Speech API
    });
  });
  return { items, needTranslate };
};

// ── Game 2: Sắp xếp câu (VN prompt → kéo thả từ EN) ──
// GIỮ NGUYÊN dấu câu (?, ., ') bằng cách tách theo khoảng trắng (không strip) → token "you?" còn dấu hỏi.
const buildGame2 = (sentences, _cfg) => {
  const items = [];
  const needTranslate = [];
  sentences.forEach((s, idx) => {
    const words = s.sentence.split(/\s+/).filter(Boolean);
    if (words.length < 2) return;
    if (!s.translation) needTranslate.push(s.sentence);
    items.push({
      id: `g2_${idx + 1}`,
      prompt: s.translation || '',      // '' → MyMemory dịch khi bật enrich
      sentence: s.sentence,
      shuffled: shuffle(words),
      answer: words,                    // thứ tự đúng — GIỮ dấu câu
      audio: audioNote(s.sentence),
    });
  });
  return { items, needTranslate };
};

// ── Game 3: Điền từ vào ô trống (câu EN khuyết → 4 từ EN) ──
// Chống "nhiều đáp án đúng": (1) chọn câu DÀI nhất chứa từ (ngữ cảnh rõ) + ưu tiên câu ví dụ
// dictionaryapi.dev; (2) bỏ frame quá ngắn (< MIN_BLANK_WORDS) vì dễ mơ hồ ("I am ___");
// (3) loại distractor cùng "lớp đóng" với đáp án (số → bỏ distractor là số) để các lựa chọn sai
// thật sự sai.
const buildGame3 = (enriched, sentences, cfg) => {
  const items = [];
  const needExample = [];
  const ambiguous = [];
  const maxExampleLen = cfg.grade && cfg.grade <= 5 ? 14 : 26; // câu ví dụ dài quá → khó/lạc đề với khối nhỏ
  enriched.forEach((v, idx) => {
    const re = new RegExp(`\\b${escapeRe(v.word)}\\b`, 'i');

    // 1) ƯU TIÊN câu của GV (đúng chủ đề bài học), đủ dài để ngữ cảnh rõ → chọn câu dài nhất.
    const teacher = sentences.map((s) => s.sentence).filter((x) => re.test(x));
    let srcSentence = teacher.filter((x) => wordCount(x) >= MIN_BLANK_WORDS).sort((a, b) => wordCount(b) - wordCount(a))[0];

    // 2) FALLBACK: câu ví dụ dictionaryapi.dev (giới hạn độ dài theo khối).
    if (!srcSentence && v.exampleSentence && re.test(v.exampleSentence)) {
      const ex = v.exampleSentence.trim();
      if (wordCount(ex) >= MIN_BLANK_WORDS && wordCount(ex) <= maxExampleLen) srcSentence = ex;
    }
    if (!srcSentence) {
      (teacher.length ? ambiguous : needExample).push(v.word); // có câu nhưng quá ngắn → mơ hồ; không có → cần ví dụ
      return;
    }

    const blanked = srcSentence.replace(re, '_____');
    let pool = (v.distractors || []).filter((d) => d && d.toLowerCase() !== v.word.toLowerCase());
    if (isNumberWord(v.word)) pool = pool.filter((d) => !isNumberWord(d)); // tránh "số vs số" → nhiều đáp án đúng
    const distractors = shuffle(pool).slice(0, cfg.optionsCount - 1);
    if (distractors.length < 1) { needExample.push(v.word); return; }
    const options = shuffle([v.word, ...distractors]);
    items.push({
      id: `g3_${idx + 1}`,
      sentence: blanked,
      correctWord: v.word,
      options,
      answer: options.indexOf(v.word),
      audio: audioNote(srcSentence),
    });
  });
  return { items, needExample, ambiguous };
};

/**
 * Sinh đủ 3 game + quiz (trắc nghiệm GV có sẵn) từ 3 ô text.
 * @param {{vocabText?:string, sentenceText?:string, mcqText?:string, grade?:number|string}} input
 */
const generate = async (input = {}) => {
  const cfg = gradeConfig(input.grade);
  const doEnrich = input.enrich !== false; // mặc định BẬT: bổ sung IPA/audio (dictionaryapi.dev) + dịch (MyMemory)

  const v = parseVocab(input.vocabText);
  const s = parseSentences(input.sentenceText);
  const q = parseQuestions(input.mcqText);

  // ── Tầng 1 (API ngoài): IPA/audio/câu ví dụ + dịch câu sang VN ──
  let vocabBase = v.vocabularies;
  let sentenceBase = s.sentences;
  let enrichError = '';
  if (doEnrich && (vocabBase.length || sentenceBase.length)) {
    try {
      const e = await enrich.enrichAll({ vocabularies: vocabBase, sentences: sentenceBase });
      vocabBase = e.vocabularies;   // + phonetic, audioUrl, exampleSentence, partOfSpeech, definitionEn
      sentenceBase = e.sentences;   // + translation
    } catch (err) {
      enrichError = err.message || 'enrich failed';
    }
  }

  // Từ nhiễu OFFLINE (anh em trong bài + EASY_BANK) — 0 API ngoài.
  const enriched = await enrich.addDistractors(vocabBase, { max: 12 });

  const g1 = cfg.games.includes(1) ? buildGame1(enriched, cfg) : { items: [], needTranslate: [] };
  const g2 = cfg.games.includes(2) ? buildGame2(sentenceBase, cfg) : { items: [], needTranslate: [] };
  const g3 = cfg.games.includes(3) ? buildGame3(enriched, sentenceBase, cfg) : { items: [], needExample: [], ambiguous: [] };

  const games = {
    game1_flashcard: { title: 'Flashcard chọn nghĩa', type: 'VOCAB', count: g1.items.length, items: g1.items },
    game2_arrange: { title: 'Sắp xếp câu', type: 'PATTERN', count: g2.items.length, items: g2.items },
    game3_fillblank: { title: 'Điền từ vào ô trống', type: 'QUIZ', count: g3.items.length, items: g3.items },
    quiz_teacher: { title: 'Trắc nghiệm (GV cung cấp)', type: 'QUIZ', count: q.questions.length, items: q.questions },
  };

  return {
    classified: { vocabularies: v.vocabularies, sentences: s.sentences, questions: q.questions },
    config: cfg,
    games,
    meta: {
      enriched: doEnrich && !enrichError,
      enrichError,
      counts: {
        vocabularies: v.vocabularies.length,
        sentences: s.sentences.length,
        questions: q.questions.length,
        game1: g1.items.length, game2: g2.items.length, game3: g3.items.length,
      },
      warnings: {
        vocab: v.warnings, sentence: s.warnings, mcq: q.warnings,
        needTranslateVocab: g1.needTranslate,    // chưa có nghĩa VN
        needTranslateSentence: g2.needTranslate, // chưa có bản dịch (nếu enrich lỗi)
        needExample: g3.needExample,             // không có câu ví dụ chứa từ → dictionaryapi.dev
        ambiguousBlank: g3.ambiguous,            // câu quá ngắn/mơ hồ → đã BỎ khỏi Game 3
      },
      apiNotes: {
        audio: 'Web Speech API (trình duyệt) đọc word/câu real-time; Game 1 kèm audioUrl mp3 từ dictionaryapi.dev nếu có.',
        phonetic: doEnrich ? 'Đã lấy IPA từ dictionaryapi.dev (có cache).' : 'dictionaryapi.dev (bật enrich để lấy).',
        translation: doEnrich ? 'Đã dịch câu sang VN bằng MyMemory API (en|vi).' : 'MyMemory API (bật enrich để dịch).',
        distractors: 'Tạo OFFLINE (anh em trong bài + EASY_BANK; loại distractor cùng lớp số) — 0 API.',
      },
    },
  };
};

module.exports = { generate, parseVocab, parseSentences, parseQuestions, gradeConfig };
