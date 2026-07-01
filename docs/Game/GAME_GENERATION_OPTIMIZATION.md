# 🎮 CƠ CHẾ TỐI ƯU SINH GAME TỪ TỪ VỰNG & MẪU CÂU

> **Tài liệu kỹ thuật** mô tả cơ chế tối ưu khi có từ vựng hoặc câu → sinh ra được 3 game học tiếng Anh.  
> Chi phí API: **$0/tháng** (tất cả API đều miễn phí).

---

## 1. TỔNG QUAN LUỒNG XỬ LÝ

```
┌──────────────────────────────────────────────────────────────┐
│                    GIÁO VIÊN NHẬP DỮ LIỆU                   │
│                                                              │
│   Từ vựng: student, teacher, school, environment             │
│   Mẫu câu: I am a student. / We should protect the          │
│            environment.                                      │
│                                                              │
│   Nguồn: Nhập tay / Upload ảnh-PDF (OCR Tesseract.js)       │
└─────────────────────────┬────────────────────────────────────┘
                          │ Bấm "GIAO BÀI TẬP"
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              TẦNG 1 — PRE-CACHE (Teacher-time)               │
│                                                              │
│   Với MỖI TỪ: Check DB trước                                │
│   ├── Đã có → Bỏ qua, lấy DB                                │
│   └── Chưa có → Gọi API song song:                          │
│       ├── dictionaryapi.dev → phiên âm, audio, định nghĩa   │
│       └── MyMemory → nghĩa tiếng Việt                       │
│       → Lưu vào bảng DictionaryCache                         │
│                                                              │
│   Với MỖI CÂU: Check DB trước                               │
│   ├── Đã có → Bỏ qua, lấy DB                                │
│   └── Chưa có → Gọi MyMemory dịch EN→VN                     │
│       → Lưu vào bảng TranslationCache                        │
└─────────────────────────┬────────────────────────────────────┘
                          │ Học sinh mở game
                          ▼
┌──────────────────────────────────────────────────────────────┐
│          TẦNG 2 — LAZY CACHE (Student-time, lần đầu)         │
│                                                              │
│   Khi HS chơi game cần từ nhiễu:                             │
│   ├── DB đã có distractors → Lấy luôn ⚡                     │
│   └── DB chưa có → Gọi API:                                 │
│       ├── Datamuse → 8 từ nhiễu EN cùng trường ngữ nghĩa    │
│       └── MyMemory → dịch 8 từ nhiễu sang VN                │
│       → Cập nhật DictionaryCache (distractors, distractorsVi)│
└─────────────────────────┬────────────────────────────────────┘
                          │ HS thứ 2, 3, 4...
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              TẤT CẢ LẤY TỪ DB — 0 API CALL ⚡                │
│                                                              │
│   Audio phát âm: Web Speech API (browser, real-time)         │
│   hoặc dùng audioUrl đã lưu từ dictionaryapi.dev            │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DANH SÁCH API SỬ DỤNG

### 2.1. Dictionary API — Phiên âm + Định nghĩa

| Mục | Chi tiết |
|-----|---------|
| **Tên** | Free Dictionary API |
| **URL** | `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` |
| **API Key** | Không cần |
| **Giới hạn** | Không giới hạn (fair use) |
| **Dữ liệu trả về** | phonetic (IPA), audio URL (.mp3), definitions, examples, part of speech, synonyms |
| **Dùng cho** | Tầng 1 — lấy thông tin cơ bản của từ |

```javascript
// Ví dụ gọi API
const response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/student');
const data = await response.json();

// Kết quả cần lấy:
const phonetic   = data[0].phonetic;                          // "/ˈstjuːdənt/"
const audioUrl   = data[0].phonetics.find(p => p.audio)?.audio; // ".../student-us.mp3"
const definition = data[0].meanings[0].definitions[0].definition; // "A person who studies..."
const example    = data[0].meanings[0].definitions[0].example;   // "She is a good student."
const pos        = data[0].meanings[0].partOfSpeech;            // "noun"
```

### 2.2. Translation API — Dịch EN → VN

| Mục | Chi tiết |
|-----|---------|
| **Tên** | MyMemory Translation API |
| **URL** | `https://api.mymemory.translated.net/get?q={text}&langpair=en\|vi` |
| **API Key** | Không cần |
| **Giới hạn** | 5,000 ký tự/ngày (ẩn danh), 50,000 ký tự/ngày (thêm email vào param `&de=email`) |
| **Dữ liệu trả về** | translatedText |
| **Dùng cho** | Tầng 1 — dịch nghĩa từ + câu sang tiếng Việt |

```javascript
// Dịch từ đơn
const res = await fetch('https://api.mymemory.translated.net/get?q=student&langpair=en|vi');
const data = await res.json();
const meaningVi = data.responseData.translatedText; // "học sinh"

// Dịch câu (có thể thêm &de=email để nâng limit)
const sentence = encodeURIComponent("I am a student at this school.");
const res2 = await fetch(`https://api.mymemory.translated.net/get?q=${sentence}&langpair=en|vi&de=myemail@gmail.com`);
const data2 = await res2.json();
const translationVi = data2.responseData.translatedText; // "Tôi là học sinh ở trường này."
```

### 2.3. Distractor API — Từ Nhiễu

| Mục | Chi tiết |
|-----|---------|
| **Tên** | Datamuse API |
| **URL** | `https://api.datamuse.com/words?ml={word}&max=8` |
| **API Key** | Không cần |
| **Giới hạn** | 100,000 requests/ngày |
| **Dữ liệu trả về** | Mảng các từ liên quan, sắp xếp theo độ phù hợp |
| **Dùng cho** | Tầng 2 — lấy từ nhiễu khi HS chơi game lần đầu |

```javascript
// Lấy 8 từ nhiễu cùng trường ngữ nghĩa
const res = await fetch('https://api.datamuse.com/words?ml=student&max=8');
const data = await res.json();
const distractors = data.map(d => d.word);
// → ["pupil", "learner", "scholar", "trainee", "apprentice", "undergraduate", "freshman", "cadet"]
```

**Các endpoint hữu ích khác:**
- `?rel_syn={word}` — từ đồng nghĩa
- `?rel_ant={word}` — từ trái nghĩa
- `?rel_trg={word}` — từ liên quan thống kê (cùng chủ đề)

### 2.4. Audio — Phát Âm

| Mục | Chi tiết |
|-----|---------|
| **Tên** | Web Speech API (Google TTS trên browser) |
| **Cách dùng** | `SpeechSynthesisUtterance` — chạy trực tiếp trên browser |
| **API Key** | Không cần |
| **Giới hạn** | Không giới hạn |
| **Cache** | KHÔNG cache (real-time) |

```javascript
// Phương án 1: Browser TTS
const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9; // chậm hơn cho HS
  window.speechSynthesis.speak(utterance);
};
speak("I am a student");

// Phương án 2: Phát file .mp3 từ URL đã cache trong DB
const audio = new Audio(dictionaryCache.audioUrl);
audio.play();
```

### 2.5. OCR — Nhận Diện Ký Tự Từ Ảnh

| Mục | Chi tiết |
|-----|---------|
| **Tên** | Tesseract.js |
| **Package** | `npm install tesseract.js` |
| **Chạy** | Trên browser (client-side) hoặc server (Node.js) |
| **Giới hạn** | Không giới hạn (chạy local) |
| **Ngôn ngữ** | Tiếng Anh (accuracy ~97%+) |

```javascript
import Tesseract from 'tesseract.js';

const result = await Tesseract.recognize(imageFile, 'eng');
const extractedText = result.data.text;
// → "Vocabulary: student, teacher, school..."
```

---

## 3. DATABASE SCHEMA (BẢNG CACHE)

### 3.1. Bảng DictionaryCache

Mỗi từ tiếng Anh chỉ có **1 bản ghi duy nhất**. Lần đầu gọi API → lưu. Mãi mãi sau lấy từ DB.

```prisma
model DictionaryCache {
  id              String   @id @default(cuid())
  word            String   @unique        // Key lookup — "student"

  // ── TẦNG 1: Pre-cache lúc GV giao bài ──
  phonetic        String?                 // "/ˈstjuːdənt/"
  audioUrl        String?                 // "https://...student-us.mp3"
  definitionEn    String?                 // "A person who studies..."
  meaningVi       String?                 // "học sinh"
  partOfSpeech    String?                 // "noun"
  exampleSentence String?                 // "She is a good student."

  // ── TẦNG 2: Lazy cache lúc HS chơi game lần đầu ──
  distractors     Json?                   // ["pupil","learner","scholar",...] (8 từ)
  distractorsVi   Json?                   // ["học trò","người học","học giả",...] (8 từ)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 3.2. Bảng TranslationCache

Mỗi câu tiếng Anh chỉ có **1 bản ghi duy nhất**.

```prisma
model TranslationCache {
  id             String   @id @default(cuid())
  originalText   String   @unique         // "I am a student at this school."
  translatedText String                   // "Tôi là một học sinh ở trường này."
  langPair       String   @default("en|vi")
  createdAt      DateTime @default(now())
}
```

---

## 4. CƠ CHẾ SINH 3 GAME

### 4.1. Game 1: FLASHCARD TRẮC NGHIỆM TỪ VỰNG

**Mô tả**: Hiển thị thẻ từ vựng EN → Học sinh chọn nghĩa VN đúng từ 4 lựa chọn (1 đúng + 3 nhiễu).

**Luồng xử lý:**

```
INPUT: Từ "student" từ bài tập đã giao
                ↓
BƯỚC 1: Lấy thông tin từ DB (DictionaryCache)
  → phonetic: "/ˈstjuːdənt/"
  → meaningVi: "học sinh"           ← Đáp án đúng
  → audioUrl: "https://...mp3"
                ↓
BƯỚC 2: Lấy từ nhiễu từ DB (DictionaryCache.distractorsVi)
  → Nếu NULL: gọi Datamuse + MyMemory → lưu DB
  → Nếu CÓ: lấy luôn
  → Pool: ["học trò", "người học", "học giả", "người học việc",
           "thực tập sinh", "tân sinh viên", "sinh viên", "thiếu sinh quân"]
                ↓
BƯỚC 3: Bốc random 3 từ nhiễu từ pool 8
  → Ví dụ: ["người học", "thực tập sinh", "tân sinh viên"]
                ↓
BƯỚC 4: Trộn 4 đáp án (1 đúng + 3 nhiễu) → Xáo vị trí
  → ["thực tập sinh", "học sinh" ✅, "tân sinh viên", "người học"]
                ↓
OUTPUT → Frontend hiển thị:
  ┌─────────────────────────┐
  │   📖 STUDENT            │
  │   /ˈstjuːdənt/   🔊    │
  │                         │
  │   A. thực tập sinh      │
  │   B. học sinh      ← ✅  │
  │   C. tân sinh viên      │
  │   D. người học          │
  └─────────────────────────┘
```

**API sử dụng:**

| Dữ liệu | API | Tầng cache | Cache ở đâu |
|----------|-----|-----------|-------------|
| Phiên âm + audio | dictionaryapi.dev | Tầng 1 | `DictionaryCache.phonetic`, `.audioUrl` |
| Nghĩa VN đúng | MyMemory | Tầng 1 | `DictionaryCache.meaningVi` |
| 8 từ nhiễu EN | Datamuse | Tầng 2 | `DictionaryCache.distractors` |
| 8 nghĩa nhiễu VN | MyMemory | Tầng 2 | `DictionaryCache.distractorsVi` |
| Audio phát âm | Web Speech API | Không cache | Browser real-time |

---

### 4.2. Game 2: SẮP XẾP CÂU

**Mô tả**: Hiển thị nghĩa VN của câu → Học sinh kéo thả các từ EN đã xáo trộn thành câu đúng.

**Luồng xử lý:**

```
INPUT: Câu "I am a student at this school." từ bài tập
                ↓
BƯỚC 1: Lấy bản dịch VN từ DB (TranslationCache)
  → "Tôi là một học sinh ở trường này."
                ↓
BƯỚC 2: Tách câu EN thành mảng từ (JavaScript)
  → ["I", "am", "a", "student", "at", "this", "school"]
                ↓
BƯỚC 3: Xáo trộn mảng từ (Fisher-Yates shuffle)
  → ["school", "am", "at", "I", "student", "a", "this"]
                ↓
BƯỚC 4: Lưu đáp án đúng để so sánh
  → correctOrder: ["I", "am", "a", "student", "at", "this", "school"]
                ↓
OUTPUT → Frontend hiển thị:
  ┌───────────────────────────────────────────┐
  │   🇻🇳 "Tôi là một học sinh ở trường này."  │
  │                                           │
  │   Sắp xếp câu tiếng Anh:                 │
  │                                           │
  │   [school] [am] [at] [I] [student] [a]    │
  │   [this]                                  │
  │                                           │
  │   ┌─────────────────────────────────────┐ │
  │   │ Kéo thả vào đây...                 │ │
  │   └─────────────────────────────────────┘ │
  └───────────────────────────────────────────┘
```

**API sử dụng:**

| Dữ liệu | API | Tầng cache | Cache ở đâu |
|----------|-----|-----------|-------------|
| Câu EN gốc | GV nhập | — | `Pattern.sentence` |
| Nghĩa VN của câu | MyMemory | Tầng 1 | `TranslationCache.translatedText` |
| Tách + xáo trộn từ | JavaScript | — | Xử lý client-side |
| Audio phát âm câu | Web Speech API | Không cache | Browser real-time |

---

### 4.3. Game 3: ĐIỀN TỪ VÀO Ô TRỐNG

**Mô tả**: Hiển thị câu EN có chỗ trống → Học sinh chọn từ EN đúng điền vào (+ 3 từ nhiễu EN).

**Luồng xử lý:**

```
INPUT: Từ "student" + câu ví dụ "She is a good student."
                ↓
BƯỚC 1: Tạo câu trống (JavaScript)
  → "She is a good ___."
  → blankWord: "student"
                ↓
BƯỚC 2: Lấy từ nhiễu EN từ DB (DictionaryCache.distractors)
  → Nếu NULL: gọi Datamuse → lưu DB
  → Nếu CÓ: lấy luôn
  → Pool: ["pupil", "learner", "scholar", "trainee", ...]
                ↓
BƯỚC 3: Bốc random 3 từ nhiễu EN từ pool
  → ["learner", "trainee", "scholar"]
                ↓
BƯỚC 4: Trộn 4 đáp án EN (1 đúng + 3 nhiễu) → Xáo vị trí
  → ["trainee", "student" ✅, "scholar", "learner"]
                ↓
OUTPUT → Frontend hiển thị:
  ┌───────────────────────────────────────────┐
  │   She is a good ___________.              │
  │                                           │
  │   Chọn từ đúng:                           │
  │                                           │
  │   [trainee]  [student ✅]  [scholar]       │
  │   [learner]                               │
  └───────────────────────────────────────────┘
```

**Nguồn câu cho Game 3:**
- **Ưu tiên 1**: Câu ví dụ từ `DictionaryCache.exampleSentence` (lấy từ dictionaryapi.dev)
- **Ưu tiên 2**: Mẫu câu GV nhập (`Pattern.sentence`) nếu chứa từ đó

**API sử dụng:**

| Dữ liệu | API | Tầng cache | Cache ở đâu |
|----------|-----|-----------|-------------|
| Câu có chỗ trống | JavaScript `.replace()` | — | Xử lý client-side |
| Từ EN đúng | GV nhập | — | `Vocabulary.word` |
| 3 từ EN nhiễu | Datamuse | Tầng 2 | `DictionaryCache.distractors` |
| Audio phát âm | Web Speech API | Không cache | Browser real-time |

---

## 5. BACKEND SERVICE — CƠ CHẾ CACHE

### 5.1. Hàm xử lý Tầng 1 (Teacher-time)

```javascript
// Pseudocode — Gọi khi GV bấm "GIAO BÀI TẬP"
async function preCacheAssignment(vocabularyList, sentenceList) {
  
  // === Xử lý từ vựng ===
  for (const word of vocabularyList) {
    // Check DB trước
    let cached = await db.dictionaryCache.findUnique({ where: { word } });
    
    if (!cached) {
      // Gọi 2 API song song
      const [dictData, transData] = await Promise.all([
        fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`).then(r => r.json()),
        fetch(`https://api.mymemory.translated.net/get?q=${word}&langpair=en|vi`).then(r => r.json())
      ]);
      
      // Lưu vào DB
      await db.dictionaryCache.create({
        data: {
          word: word,
          phonetic: dictData[0]?.phonetic || null,
          audioUrl: dictData[0]?.phonetics?.find(p => p.audio)?.audio || null,
          definitionEn: dictData[0]?.meanings?.[0]?.definitions?.[0]?.definition || null,
          meaningVi: transData?.responseData?.translatedText || null,
          partOfSpeech: dictData[0]?.meanings?.[0]?.partOfSpeech || null,
          exampleSentence: dictData[0]?.meanings?.[0]?.definitions?.[0]?.example || null,
          // distractors: NULL — sẽ lazy cache ở Tầng 2
        }
      });
    }
  }
  
  // === Xử lý mẫu câu ===
  for (const sentence of sentenceList) {
    let cached = await db.translationCache.findUnique({ where: { originalText: sentence } });
    
    if (!cached) {
      const transData = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sentence)}&langpair=en|vi`
      ).then(r => r.json());
      
      await db.translationCache.create({
        data: {
          originalText: sentence,
          translatedText: transData?.responseData?.translatedText || sentence,
          langPair: "en|vi"
        }
      });
    }
  }
}
```

### 5.2. Hàm xử lý Tầng 2 (Student-time)

```javascript
// Pseudocode — Gọi khi HS chơi game cần từ nhiễu
async function getDistractors(word) {
  // Check DB trước
  let cached = await db.dictionaryCache.findUnique({ where: { word } });
  
  // Nếu đã có distractors → trả về luôn
  if (cached && cached.distractors && cached.distractorsVi) {
    return {
      distractors: cached.distractors,    // ["pupil", "learner", ...]
      distractorsVi: cached.distractorsVi  // ["học trò", "người học", ...]
    };
  }
  
  // Chưa có → Gọi Datamuse lấy 8 từ nhiễu
  const datamuseRes = await fetch(
    `https://api.datamuse.com/words?ml=${word}&max=8`
  ).then(r => r.json());
  
  const distractorWords = datamuseRes.map(d => d.word);
  
  // Dịch 8 từ nhiễu sang VN (song song)
  const translations = await Promise.all(
    distractorWords.map(dw =>
      fetch(`https://api.mymemory.translated.net/get?q=${dw}&langpair=en|vi`)
        .then(r => r.json())
        .then(data => data.responseData.translatedText)
    )
  );
  
  // Cập nhật DB
  await db.dictionaryCache.update({
    where: { word },
    data: {
      distractors: distractorWords,
      distractorsVi: translations
    }
  });
  
  return {
    distractors: distractorWords,
    distractorsVi: translations
  };
}
```

### 5.3. Hàm sinh data cho từng Game

```javascript
// Game 1: Flashcard Trắc Nghiệm
async function generateFlashcardQuiz(word) {
  const cache = await db.dictionaryCache.findUnique({ where: { word } });
  const { distractorsVi } = await getDistractors(word);
  
  // Bốc random 3 từ nhiễu VN
  const shuffled = distractorsVi.sort(() => Math.random() - 0.5);
  const wrongAnswers = shuffled.slice(0, 3);
  
  // Trộn 4 đáp án
  const options = [...wrongAnswers, cache.meaningVi].sort(() => Math.random() - 0.5);
  
  return {
    word: cache.word,
    phonetic: cache.phonetic,
    audioUrl: cache.audioUrl,
    correctAnswer: cache.meaningVi,
    options: options  // 4 đáp án VN (1 đúng + 3 nhiễu)
  };
}

// Game 2: Sắp Xếp Câu
async function generateSentenceArrange(sentence) {
  const cache = await db.translationCache.findUnique({ where: { originalText: sentence } });
  
  const words = sentence.replace(/[.,!?]/g, '').split(' ');
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);
  
  return {
    translationVi: cache.translatedText,
    shuffledWords: shuffledWords,
    correctOrder: words
  };
}

// Game 3: Điền Từ Vào Ô Trống
async function generateFillBlank(word) {
  const cache = await db.dictionaryCache.findUnique({ where: { word } });
  const { distractors } = await getDistractors(word);
  
  // Tạo câu trống
  const sentence = cache.exampleSentence || "___";
  const blankSentence = sentence.replace(new RegExp(word, 'gi'), '___');
  
  // Bốc 3 từ nhiễu EN
  const wrongAnswers = distractors.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...wrongAnswers, word].sort(() => Math.random() - 0.5);
  
  return {
    sentence: blankSentence,
    correctWord: word,
    options: options  // 4 đáp án EN (1 đúng + 3 nhiễu)
  };
}
```

---

## 6. HIỆU QUẢ TỐI ƯU

### Ví dụ thực tế: Bài tập 10 từ + 5 câu

| Giai đoạn | Số API calls | Thời gian |
|-----------|-------------|-----------|
| **Tầng 1** — GV giao bài (10 từ mới + 5 câu mới) | ~25 calls | ~3-5 giây |
| **Tầng 2** — HS đầu tiên chơi (10 từ cần nhiễu) | ~90 calls | ~5-8 giây |
| **HS thứ 2 trở đi** | **0 calls** | **< 50ms** ⚡ |

### Hệ thống tự "thông minh" theo thời gian:

| Thời điểm | Số từ trong DB | % từ đã cache | API calls/bài mới |
|-----------|---------------|---------------|-------------------|
| Tuần 1 | ~50 từ | 0% | ~115 calls |
| Tháng 1 | ~200 từ | ~30% | ~80 calls |
| Tháng 3 | ~500 từ | ~60% | ~45 calls |
| Tháng 6 | ~1000 từ | ~85% | ~15 calls |
| Năm 1 | ~2000+ từ | ~95% | ~5 calls |

### Tổng chi phí:

| API | Giá | Giới hạn/ngày |
|-----|-----|--------------|
| dictionaryapi.dev | **$0** | Không giới hạn |
| MyMemory | **$0** | 50,000 ký tự (có email) |
| Datamuse | **$0** | 100,000 requests |
| Web Speech API | **$0** | Không giới hạn |
| Tesseract.js | **$0** | Không giới hạn |
| **TỔNG** | **$0/tháng** | ✅ |

---

## 7. LƯU Ý QUAN TRỌNG

1. **Thứ tự ưu tiên**: Luôn check DB trước → Chỉ gọi API khi DB không có dữ liệu.
2. **Gọi song song**: Dùng `Promise.all()` khi cần gọi nhiều API cùng lúc → giảm thời gian chờ.
3. **Error handling**: Nếu API ngoài lỗi/timeout → dùng fallback (ví dụ: trả về từ gốc EN thay vì nghĩa VN).
4. **Audio không cache**: Web Speech API chạy real-time trên browser, không cần lưu DB.
5. **MyMemory limit**: Thêm `&de=email@gmail.com` vào URL để nâng limit lên 50K ký tự/ngày.
6. **Datamuse fallback**: Nếu `?ml=` không trả đủ 8 từ → dùng `?rel_syn=` (synonym) hoặc `?rel_trg=` (trigger) bổ sung.
