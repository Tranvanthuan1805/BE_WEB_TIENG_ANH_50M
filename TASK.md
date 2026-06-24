# [1.4] API Gán Nội Dung Vào Nhóm (Từ Vựng / Mẫu Câu)

**Người phụ trách:** Đoàn Kim Tài | **Deadline:** 06/07/2026 | **Ưu tiên:** Trung bình
**Phụ thuộc:** Task 1.3 (OCR trả về text)

---

## Endpoints

```
POST /api/exercises/:id/assign-vocab
Body: { text: string }
– Parse text thành { word, meaning } và tạo Vocab record

POST /api/exercises/:id/assign-sentence
Body: { text: string }
– Tạo Sentence record từ text GV bôi chọn
```

## Việc cần làm

### Service
- [ ] `assignVocab(exerciseId, text)`:
  - Parse text: nếu có format `word - meaning` → tự split
  - Nếu chỉ có từ đơn → tạo vocab với meaning để trống (GV fill sau)
  - Insert vào DB

- [ ] `assignSentence(exerciseId, text)`:
  - Tạo Sentence với `content = text`, `translation = ""` (GV fill sau)
  - Insert vào DB

### Batch Endpoint
- [ ] `POST /api/exercises/:id/assign-bulk`:
  - Body: `{ items: [{ type: 'vocab'|'sentence', text: string }] }`
  - Batch insert tất cả trong 1 transaction

## Tiêu chí hoàn thành
- [ ] Assign vocab từ text đơn và text có format `word - meaning`
- [ ] Assign sentence hoạt động
- [ ] Batch insert hoạt động trong transaction