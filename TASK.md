# [1.1] API Quản Lý Lớp Học & Bài Tập

**Người phụ trách:** Đoàn Kim Tài | **Deadline:** 23/06/2026 | **Ưu tiên:** Cao
**Phụ thuộc:** Tasks 0.1, 0.2, 0.3 hoàn thành

---

## Endpoints cần implement

### Classes
```
POST   /api/classes          – Tạo lớp mới (role: TEACHER)
GET    /api/classes          – Danh sách lớp của GV hiện tại (role: TEACHER)
GET    /api/classes/:id      – Chi tiết lớp + danh sách HS (role: TEACHER)
PUT    /api/classes/:id      – Cập nhật tên lớp (role: TEACHER)
DELETE /api/classes/:id      – Xóa lớp (role: TEACHER)
```

### Exercises
```
POST   /api/exercises        – Tạo bài tập mới { title, classId } (role: TEACHER)
GET    /api/exercises        – Danh sách bài tập theo classId (role: TEACHER)
GET    /api/exercises/:id    – Chi tiết bài tập (role: TEACHER|STUDENT)
```

## Việc cần làm

### Service Layer (`src/services/class.service.ts`)
- [ ] `createClass(teacherId, dto)` – tạo class, gán teacherId
- [ ] `getTeacherClasses(teacherId)` – lấy danh sách lớp của GV
- [ ] `createExercise(teacherId, dto)` – tạo exercise, verify GV sở hữu classId

### Controller & Routes
- [ ] `src/controllers/class.controller.ts`
- [ ] `src/routes/class.routes.ts` với middleware `authenticate` + `authorize(['TEACHER'])`

### Validation (Zod)
- [ ] Class: `name` required, max 100 chars
- [ ] Exercise: `title` required, `classId` phải thuộc lớp của GV

## Tiêu chí hoàn thành
- [ ] Tất cả endpoints trả về đúng format
- [ ] GV chỉ thấy lớp/bài tập của mình
- [ ] Validation lỗi trả về 400 với message rõ ràng