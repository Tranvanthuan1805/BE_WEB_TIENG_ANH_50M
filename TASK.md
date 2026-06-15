# [0.1] Project Setup & CI/CD Backend

**Người phụ trách:** Trần Văn Thuần | **Deadline:** 16/06/2026 | **Ưu tiên:** Cao

---

## Việc cần làm

### 1. Khởi tạo dự án
- [ ] Node.js + Express hoặc NestJS + TypeScript
- [ ] Cấu trúc thư mục:
  ```
  src/
  ├── controllers/  # Route handlers
  ├── services/     # Business logic
  ├── models/       # Prisma models / ORM
  ├── middleware/   # Auth, RBAC, error handler
  ├── routes/       # Express routers
  └── types/        # TypeScript types
  ```
- [ ] Prisma ORM setup (nếu dùng SQL) hoặc Mongoose (MongoDB)

### 2. GitHub Actions
- [ ] `.github/workflows/ci.yml` – lint + test + build
- [ ] `.github/workflows/deploy.yml` – deploy server (Railway/Render/VPS)

### 3. Environment Variables
- [ ] `.env.example`:
  ```
  DATABASE_URL=
  JWT_SECRET=
  GOOGLE_VISION_API_KEY=
  OPENAI_API_KEY=
  PORT=3001
  ```

### 4. Base Setup
- [ ] CORS config (chỉ allow FE domain)
- [ ] Helmet, rate-limiting middleware
- [ ] Global error handler
- [ ] Health check endpoint: `GET /health`

## Tiêu chí hoàn thành
- [ ] Server khởi động thành công trên `PORT=3001`
- [ ] `GET /health` trả về 200
- [ ] CI GitHub Actions xanh