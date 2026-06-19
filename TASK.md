# [2.2] API Học Mẫu Câu – Flashcard 3 Modes

**Người phụ trách:** Trần Minh Vĩ | **Deadline:** 02/07/2026 | **Ưu tiên:** Cao

---

## Endpoints

```
GET  /api/student/exercises/:id/sentences
– Trả về sentences kèm 3 distractors cho mode "Chọn nghĩa"
Response: [{ id, content, translation, distractors: string[] }]

POST /api/student/sentences/:sentenceId/answer
Body: { answer: string, mode: 'choose'|'arrange'|'fill' }
Response: { correct: boolean, correctAnswer: string, score: number }

GET  /api/student/exercises/:id/sentence-progress
Response: { total, completed, percentage }
```

## Việc cần làm

### Distractors Logic
- [ ] Lấy 3 translations từ các câu khác trong cùng exercise
- [ ] Nếu exercise ít câu → lấy từ exercises khác trong lớp
- [ ] Shuffle order của 4 đáp án

### Answer Checking
- [ ] Mode `choose`: so sánh `answer === translation`
- [ ] Mode `arrange`: so sánh mảng từ → join → compare
- [ ] Mode `fill`: trim + lowercase compare

### Progress Tracking
```prisma
model SentenceProgress {
  id          String  @id @default(cuid())
  userId      String
  sentenceId  String
  completed   Boolean @default(false)
  bestScore   Float   @default(0)
  @@unique([userId, sentenceId])
}
```

## Tiêu chí hoàn thành
- [ ] GET trả về sentences kèm 3 distractors đúng
- [ ] Tất cả 3 mode check đáp án chính xác
- [ ] Progress được lưu đúng