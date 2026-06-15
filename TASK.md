# [2.3] API Trắc Nghiệm 4 Đáp Án

**Người phụ trách:** Trần Minh Vĩ | **Deadline:** 07/07/2026 | **Ưu tiên:** Cao

---

## Endpoints

```
GET  /api/student/exercises/:id/quiz
– Trả về câu hỏi + 4 đáp án đã xáo trộn (seed random per session)
Response: [{ id, question, options: string[], type: 'vocab'|'sentence' }]

POST /api/student/quiz/submit
Body: { exerciseId, answers: [{ questionId, answer: string }] }
Response: { score, total, percentage, correctAnswers: {...}, stars: number }
```

## Việc cần làm

### Quiz Generation (`quiz.service.ts`)
- [ ] Lấy vocab và sentences từ exercise
- [ ] Tạo câu hỏi từ vocab: "Từ [word] có nghĩa là?" → 4 nghĩa
- [ ] Tạo câu hỏi từ sentence: "Câu nào có nghĩa là [translation]?" → 4 câu
- [ ] Shuffle options theo seed ngẫu nhiên (khác mỗi lần GET)

### Submit & Scoring
- [ ] Compare từng answer với correct answer
- [ ] Tính score: số câu đúng / tổng
- [ ] Tính sao: >= 80% = 2 sao, >= 50% = 1 sao, < 50% = 0 sao
- [ ] Lưu Score record vào DB

### Score Record
```prisma
model Score {
  // đã có trong schema 0.2
  // type = QUIZ, score = percentage (0-100)
}
```

## Tiêu chí hoàn thành
- [ ] Quiz generation có đủ 4 đáp án, 1 đúng 3 sai
- [ ] Submit tính điểm chính xác
- [ ] Score được lưu vào DB
- [ ] Thứ tự câu hỏi xáo trộn mỗi lần GET