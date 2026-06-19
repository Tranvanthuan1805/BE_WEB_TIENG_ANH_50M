# [1.2] API Nhập Nội Dung Bài Tập (Từ Vựng & Mẫu Câu)

**Người phụ trách:** Đoàn Kim Tài | **Deadline:** 25/06/2026 | **Ưu tiên:** Cao
**Phụ thuộc:** Task 1.1 hoàn thành

---

## Endpoints cần implement

### Vocabulary
```
POST   /api/exercises/:id/vocabulary      – Thêm từ vựng { word, meaning, example? }
GET    /api/exercises/:id/vocabulary      – Danh sách từ vựng của bài
PUT    /api/vocabulary/:vocabId           – Sửa từ vựng
DELETE /api/vocabulary/:vocabId           – Xóa từ vựng
POST   /api/exercises/:id/vocabulary/bulk – Import nhiều từ (từ CSV)
```

### Sentences
```
POST   /api/exercises/:id/sentences       – Thêm mẫu câu { content, translation }
GET    /api/exercises/:id/sentences       – Danh sách mẫu câu
PUT    /api/sentences/:sentenceId         – Sửa mẫu câu
DELETE /api/sentences/:sentenceId         – Xóa mẫu câu
```

## Việc cần làm

### Service Layer
- [ ] `vocab.service.ts`: CRUD vocab, bulk insert từ array
- [ ] `sentence.service.ts`: CRUD sentence

### Bulk Import
- [ ] Parse CSV input: `word,meaning,example` format
- [ ] Validate từng row, skip row lỗi (return danh sách lỗi)

### Ownership Check
- [ ] Verify GV sở hữu exerciseId trước khi thêm/sửa/xóa

## Tiêu chí hoàn thành
- [ ] CRUD từ vựng + mẫu câu hoạt động đầy đủ
- [ ] Bulk import CSV hoạt động
- [ ] Không cho sửa/xóa bài của GV khác