# [2.4] API Xử Lý Audio Speaking

**Người phụ trách:** Trần Minh Vĩ | **Deadline:** 10/07/2026 | **Ưu tiên:** Cao

---

## Endpoint

```
POST /api/student/speaking/record
Content-Type: multipart/form-data
Body: { audio: File (WebM/MP4), sentenceId: string }
Response: {
  transcript: string,      // Text AI nhận ra
  correctText: string,     // Đáp án đúng
  score: number,           // % độ chính xác (0-100)
  attempt: number,         // Lần thử thứ mấy (1-3)
  canRetry: boolean        // Còn lượt thử không
}
```

## Việc cần làm

### 1. Audio Processing
- [ ] Multer upload audio (WebM/MP4/OGG), max 5MB
- [ ] Convert sang WAV nếu cần (dùng `ffmpeg`)

### 2. Speech-to-Text (chọn 1)
**Option A: Web Speech API** (client-side, không charge)
- [ ] FE gửi transcript text, BE chỉ cần compare

**Option B: OpenAI Whisper API** (chất lượng cao)
- [ ] `openai.audio.transcriptions.create({ file, model: 'whisper-1' })`
- [ ] Cache kết quả theo audio hash

### 3. Scoring Algorithm
- [ ] So sánh `transcript` với `sentence.content`
- [ ] Dùng Levenshtein distance hoặc word-by-word match
- [ ] Tính % từ đúng: `correctWords / totalWords * 100`

### 4. Attempt Tracking
```prisma
model SpeakingAttempt {
  id         String @id @default(cuid())
  userId     String
  sentenceId String
  attempt    Int
  score      Float
  transcript String
  createdAt  DateTime @default(now())
}
```
- [ ] Max 3 attempts per (userId, sentenceId)
- [ ] Lưu điểm cao nhất cho Score record

## Tiêu chí hoàn thành
- [ ] Upload audio và nhận transcript thành công
- [ ] Score tính đúng theo % từ khớp
- [ ] Giới hạn 3 lượt/câu được enforce ở BE
- [ ] Cache kết quả AI (không call 2 lần cho cùng audio)