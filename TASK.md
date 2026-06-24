# [1.3] API Tích Hợp OCR (Nhận Diện Văn Bản)

**Người phụ trách:** Đoàn Kim Tài | **Deadline:** 01/07/2026 | **Ưu tiên:** Cao

---

## Endpoint

```
POST /api/ocr/upload
Content-Type: multipart/form-data
Body: { file: File, exerciseId: string }
Response: { extractedText: string, confidence?: number }
```

## Việc cần làm

### 1. File Upload Middleware
- [ ] Dùng `multer` để xử lý file upload
- [ ] Giới hạn: 10MB, chấp nhận `.jpg`, `.png`, `.pdf`, `.docx`
- [ ] Lưu file tạm vào `/tmp/uploads/`

### 2. OCR Integration (chọn 1)
**Option A: Google Vision API** (chất lượng cao hơn)
- [ ] Setup Google Cloud credentials
- [ ] Gọi `ImageAnnotatorClient.textDetection()`
- [ ] Parse kết quả `TextAnnotation`

**Option B: Tesseract.js** (miễn phí, chạy local)
- [ ] `npm install tesseract.js`
- [ ] `Tesseract.recognize(imagePath, 'eng+vie')`
- [ ] Xử lý PDF: convert sang ảnh trước (dùng `pdf2pic`)

### 3. Xử lý Đặc Biệt
- [ ] PDF: convert từng trang sang ảnh → OCR từng trang → ghép text
- [ ] DOCX: dùng `mammoth` để extract text (không cần OCR)
- [ ] Cache kết quả OCR theo file hash (tránh charge API 2 lần)

### 4. Cleanup
- [ ] Xóa file tạm sau khi xử lý

## Tiêu chí hoàn thành
- [ ] Upload ảnh JPG/PNG → trả về text
- [ ] Upload PDF → trả về text từng trang ghép lại
- [ ] Upload DOCX → trả về text
- [ ] Lỗi file type → 400 với message rõ ràng
- [ ] Kết quả được cache (không call API 2 lần cho cùng file)