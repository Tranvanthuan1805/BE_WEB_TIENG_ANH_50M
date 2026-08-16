# [2.1] API Học Từ Vựng & Theo Dõi Tiến Độ

**Người phụ trách:** Trần Minh Vĩ | **Deadline:** 26/06/2026 | **Ưu tiên:** Cao
**Phụ thuộc:** Tasks 0.3, 1.5 (exercise đã published)

---

## Endpoints

```
GET  /api/student/exercises/:id/vocabulary
– Trả về danh sách vocab kèm progress của HS hiện tại
Response: [{ id, word, meaning, example, known: boolean, lastStudied: Date|null }]

POST /api/student/vocabulary/:vocabId/mark
Body: { known: boolean }
– Lưu / cập nhật VocabProgress record

GET  /api/student/vocabulary/progress?exerciseId=
– Tổng quan: total, known, unknown, percentage
```

## Việc cần làm

### DB Model (thêm vào schema)
```prisma
model VocabProgress {
  id        String  @id @default(cuid())
  userId    String
  vocabId   String
  known     Boolean @default(false)
  studiedAt DateTime @default(now())
  @@unique([userId, vocabId])
}
```

### Service
- [ ] `getVocabWithProgress(exerciseId, userId)` – JOIN vocab với progress
- [ ] `markVocab(userId, vocabId, known)` – upsert VocabProgress
- [ ] Sau khi mark all as known → cộng 1 sao (gọi gamification service)

## Tiêu chí hoàn thành
- [ ] GET trả về vocab kèm known status
- [ ] POST mark hoạt động (upsert, không duplicate)
- [ ] Progress % tính đúng