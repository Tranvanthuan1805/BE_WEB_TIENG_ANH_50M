# [0.3] API Contract & RBAC Middleware

**Người phụ trách:** Trần Văn Thuần | **Deadline:** 22/06/2026 | **Ưu tiên:** Cao
**Phụ thuộc:** Tasks 0.1, 0.2 hoàn thành

---

## Việc cần làm

### 1. JWT Auth Middleware
- [ ] `POST /api/auth/login` – trả về JWT token
- [ ] `POST /api/auth/logout` – invalidate token
- [ ] `GET /api/auth/me` – trả về thông tin user hiện tại
- [ ] Middleware `authenticate`: verify JWT, gắn `req.user`

### 2. RBAC Middleware
- [ ] Middleware `authorize(roles: Role[])`:
  ```typescript
  // Dùng như: router.get('/admin/users', authenticate, authorize(['ADMIN']), handler)
  ```
- [ ] 403 nếu role không được phép

### 3. API Endpoints Definition (Swagger/OpenAPI)
Định nghĩa tất cả endpoints (chi tiết trong các task 1.x, 2.x, 3.x):

| Method | Path | Role | Task |
|--------|------|------|------|
| POST | /api/classes | TEACHER | 1.1 |
| GET | /api/classes | TEACHER | 1.1 |
| POST | /api/exercises | TEACHER | 1.1 |
| POST | /api/exercises/:id/vocabulary | TEACHER | 1.2 |
| POST | /api/ocr/upload | TEACHER | 1.3 |
| POST | /api/exercises/:id/publish | TEACHER | 1.5 |
| GET | /api/student/exercises/:id/vocabulary | STUDENT | 2.1 |
| POST | /api/student/quiz/submit | STUDENT | 2.3 |
| POST | /api/student/speaking/record | STUDENT | 2.4 |
| GET | /api/ranking | ALL | 3.1 |
| GET | /api/teacher/scores | TEACHER | 3.2 |
| GET | /api/student/scores | STUDENT | 3.3 |
| POST | /api/admin/users | ADMIN | 3.5 |

- [ ] Setup Swagger UI tại `/api/docs`

### 4. Request/Response Validation
- [ ] Dùng `zod` hoặc `joi` để validate request body
- [ ] Middleware error handler cho validation errors (400)

## Tiêu chí hoàn thành
- [ ] Login/logout/me hoạt động với JWT
- [ ] RBAC middleware chặn đúng theo role
- [ ] Swagger UI hiển thị tại `/api/docs`
- [ ] FE team có thể dùng API contract này ngay