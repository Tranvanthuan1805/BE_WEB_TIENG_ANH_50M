# [1.5] API Publish Bài Tập & Sinh Game

**Người phụ trách:** Đoàn Kim Tài | **Deadline:** 09/07/2026 | **Ưu tiên:** Cao
**Phụ thuộc:** Tasks 1.2, 1.4 phải có nội dung trước

---

## Endpoint

```
POST /api/exercises/:id/publish
– Chuyển Exercise sang status PUBLISHED
– Auto-generate game config từ vocab + sentences
– Thông báo tới tất cả HS trong lớp
Response: { exercise, gameConfig, notifiedStudents: number }
```

## Việc cần làm

### Publish Logic
- [ ] Verify exercise có ít nhất 3 từ vựng HOẶC 2 mẫu câu (min content)
- [ ] Cập nhật `status = PUBLISHED`, `publishedAt = now()`

### Game Config Generation
- [ ] Tạo record `GameConfig` từ vocab và sentences:
  ```json
  {
    "exerciseId": "...",
    "vocabGame": { "words": [...] },
    "sentenceGame": { "sentences": [...], "distractors": [...] },
    "quizGame": { "questions": [...] }
  }
  ```
- [ ] Distractors cho quiz: lấy từ các exercise khác trong cùng lớp

### Notification (optional / basic)
- [ ] Tạo Notification records cho mỗi HS trong lớp
- [ ] `GET /api/student/notifications` – HS check bài mới

## Tiêu chí hoàn thành
- [ ] Publish thành công, HS thấy bài trong danh sách
- [ ] Game config được tạo đúng
- [ ] Không publish được nếu chưa có đủ nội dung