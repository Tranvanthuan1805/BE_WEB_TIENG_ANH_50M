# BE — Web Tiếng Anh 50M

REST API Backend cho nền tảng học tiếng Anh tương tác. Xử lý auth, quản lý lớp/bài tập, OCR nhận dạng nội dung, chấm điểm speaking bằng Whisper AI, gamification.

---

## Tech Stack

| Layer         | Công nghệ               | Lý do chọn                                         |
|---------------|-------------------------|----------------------------------------------------|
| Runtime       | **Node.js 20 LTS**      | Non-blocking I/O, phù hợp REST API + file upload   |
| Framework     | **Express.js 4**        | Lightweight, middleware ecosystem đầy đủ            |
| ORM           | **Prisma 5**            | Type-safe queries, migration tự động, schema rõ    |
| Database      | **PostgreSQL 16**       | Relational, phù hợp data có quan hệ phức tạp       |
| Auth          | **JWT + bcryptjs**      | Stateless, dễ scale, không cần session store        |
| AI — Speaking | **OpenAI Whisper API**  | Chuyển audio → text + chấm điểm pronunciation      |
| OCR           | **OCR API (external)**  | Nhận dạng text từ ảnh/PDF bài tập                  |
| File upload   | **Multer**              | Xử lý multipart/form-data (audio, ảnh)             |
| Deploy        | **Railway / Render**    | PostgreSQL managed, CI/CD từ `main`                |

---

## Flow Tổng Quan

```
FE (Next.js — Vercel)
        │
        │  HTTPS REST API  (JSON)
        │  Authorization: Bearer <JWT>
        ▼
┌───────────────────────────────────────────────┐
│           Express.js Server                    │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │         Middleware Pipeline              │  │
│  │  cors() → express.json() → auth.js      │  │
│  │  (verify JWT) → rbac.js (check role)    │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Route Modules:                               │
│  POST   /api/auth/login        ← Đăng nhập   │
│  POST   /api/auth/register     ← Đăng ký     │
│  GET    /api/users             ← Admin only  │
│  CRUD   /api/classes           ← Teacher     │
│  CRUD   /api/exercises         ← Teacher     │
│  CRUD   /api/vocabulary        ← Teacher     │
│  POST   /api/ocr               ← OCR upload  │
│  POST   /api/speaking          ← Audio AI    │
│  GET    /api/scores            ← Student     │
│  GET    /api/gamification      ← All roles   │
│  *      /api/admin             ← Admin only  │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│           Prisma ORM                           │
│  Users · Classes · Exercises                  │
│  Vocabulary · Patterns · Scores               │
│  SpeakingResults · Gamification · AuditLog    │
└───────────────────────────────────────────────┘
        │
        ▼
   PostgreSQL 16
```

### RBAC — Phân quyền theo role

```
Role     │ Quyền
─────────┼──────────────────────────────────────────────────────
ADMIN    │ Toàn quyền: quản lý user, xem audit log, override
TEACHER  │ CRUD lớp, bài tập, từ vựng; xem thống kê lớp mình
STUDENT  │ Xem bài tập được giao; submit kết quả; xem điểm mình
```

### Auth Flow
```
1. POST /api/auth/login { email, password }
2. BE bcrypt.compare(password, hash)
3. BE ký JWT: { userId, role, exp: 7d }
4. FE nhận token → lưu Zustand + cookie
5. Mọi request tiếp theo: Authorization: Bearer <token>
6. auth.js middleware verify → gắn req.user
7. rbac.js middleware check req.user.role
```

### Speaking / AI Flow
```
1. FE gửi: POST /api/speaking  (multipart: audioFile + exerciseId)
2. Multer lưu file tạm
3. speaking.service.js gọi OpenAI Whisper API → transcript
4. Service tính score dựa trên transcript vs. expected text
5. Lưu SpeakingResult vào DB
6. Cập nhật Gamification (điểm, sao)
7. Trả về: { score, feedback, transcript }
```

### OCR Flow
```
1. FE gửi: POST /api/ocr (multipart: imageFile)
2. Multer nhận file
3. ocr.service.js gọi OCR API → extracted text
4. Trả về: { text, confidence }
5. Teacher review → gán text vào nhóm vocab/pattern
```

---

## Cấu Trúc Thư Mục

```
BE_WEB_TIENG_ANH_50M/
├── server.js                   ← Entry point: khởi động Express server
├── src/
│   ├── app.js                  ← Khai báo middleware + mount tất cả routes
│   ├── config/
│   │   ├── database.js         ← PrismaClient singleton
│   │   └── env.js              ← Đọc biến môi trường
│   ├── middleware/
│   │   ├── auth.js             ← Verify JWT, gắn req.user
│   │   ├── rbac.js             ← authorize(...roles) factory
│   │   └── errorHandler.js     ← Global error handler
│   ├── modules/                ← Feature modules (routes + controller + service)
│   │   ├── auth/               ← login, register, refresh token
│   │   ├── users/              ← CRUD user (Admin)
│   │   ├── classes/            ← CRUD lớp học
│   │   ├── exercises/          ← CRUD bài tập, publish, game config
│   │   ├── vocabulary/         ← CRUD từ vựng & mẫu câu
│   │   ├── scores/             ← Submit & query điểm số
│   │   ├── speaking/           ← Upload audio → Whisper AI → score
│   │   ├── ocr/                ← Upload ảnh/PDF → OCR → text
│   │   ├── gamification/       ← Điểm, sao, badges, streak, leaderboard
│   │   └── admin/              ← User management + audit log
│   └── utils/
│       ├── jwt.js              ← signToken, verifyToken
│       └── response.js         ← ok(), fail() helpers
├── prisma/
│   ├── schema.prisma           ← DB schema đầy đủ
│   └── migrations/             ← Prisma migration files
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── brief.md
│   ├── architecture.md
│   └── handover.md
├── openspec/changes/           ← OpenSpec feature specs
├── tasks/
│   ├── backlog.md
│   └── sprint-current.md
├── .env.example
├── .gitignore
├── package.json
└── workflow_agent.md
```

---

## Database Schema

```
User           — id, name, email, password (hash), role, createdAt
Class          — id, name, teacherId → User
ClassEnrollment— classId, userId (N:N)
Exercise       — id, classId, title, type, status, gameConfig (JSON)
Vocabulary     — id, exerciseId, word, meaning, audioUrl, imageUrl
Pattern        — id, exerciseId, sentence, translation, audioUrl
Score          — id, userId, exerciseId, score, completedAt
SpeakingResult — id, userId, exerciseId, audioUrl, aiScore, feedback
Gamification   — id, userId (1:1), totalPoints, stars, badges[], streak
AuditLog       — id, userId, action, target, createdAt
```

---

## Chạy Local

```bash
git clone https://github.com/Tranvanthuan1805/BE_WEB_TIENG_ANH_50M.git
cd BE_WEB_TIENG_ANH_50M
npm install
cp .env.example .env          # điền DATABASE_URL, JWT_SECRET, ...
npx prisma migrate dev        # tạo DB + chạy migrations
npm run dev
# → http://localhost:3000
```

### Environment Variables

| Variable          | Bắt buộc | Mô tả                            |
|-------------------|----------|----------------------------------|
| `DATABASE_URL`    | Có       | PostgreSQL connection string      |
| `JWT_SECRET`      | Có       | Secret key ký JWT (min 32 chars)  |
| `JWT_EXPIRES_IN`  | Không    | Token expiry, default `7d`        |
| `OPENAI_API_KEY`  | Có       | Whisper AI speaking assessment    |
| `OCR_API_KEY`     | Có       | OCR service API key               |
| `PORT`            | Không    | Server port, default `3000`       |

---

## API Endpoints

| Method | Endpoint                  | Role          | Mô tả                         |
|--------|---------------------------|---------------|-------------------------------|
| POST   | `/api/auth/login`         | Public        | Đăng nhập → JWT               |
| POST   | `/api/auth/register`      | Public        | Đăng ký tài khoản             |
| GET    | `/api/classes`            | Teacher       | Danh sách lớp                 |
| POST   | `/api/classes`            | Teacher       | Tạo lớp mới                   |
| GET    | `/api/exercises`          | Teacher/Student | Danh sách bài tập           |
| POST   | `/api/exercises`          | Teacher       | Tạo bài tập                   |
| PATCH  | `/api/exercises/:id/publish` | Teacher    | Publish bài tập               |
| GET    | `/api/vocabulary`         | Teacher/Student | Danh sách từ vựng           |
| POST   | `/api/ocr`                | Teacher       | Upload ảnh → text (OCR)       |
| POST   | `/api/speaking`           | Student       | Upload audio → AI score       |
| GET    | `/api/scores`             | Student/Teacher | Điểm số                     |
| POST   | `/api/scores`             | Student       | Nộp điểm                      |
| GET    | `/api/gamification`       | Student       | Điểm, sao, badge, streak      |
| GET    | `/api/gamification/leaderboard` | All     | Bảng xếp hạng               |
| GET    | `/api/admin/users`        | Admin         | Quản lý user                  |
| GET    | `/api/admin/audit`        | Admin         | Audit log                     |

---

## Deploy

Push lên `main` → Railway/Render tự động build & deploy.
Chạy migration trước deploy: `npx prisma migrate deploy`

---

## Liên quan

- **Frontend:** [FE_WEB_TIENG_ANH_50M](https://github.com/Tranvanthuan1805/FE_WEB_TIENG_ANH_50M) — Next.js 15 + Zustand + Vercel
- **Workflow:** [workflow_agent.md](./workflow_agent.md) — Quy trình phát triển 5 phase
