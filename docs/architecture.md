# Architecture — BE Web Tiếng Anh 50M

## Tech Stack
| Layer      | Lựa chọn           | Lý do                                 |
|------------|-------------------|---------------------------------------|
| Runtime    | Node.js 20 LTS    | Ecosystem lớn, async native           |
| Framework  | Express.js        | Lightweight, dễ cấu hình              |
| ORM        | Prisma             | Type-safe, migrations tự động         |
| Database   | PostgreSQL         | Relational, phù hợp data có quan hệ   |
| Auth       | JWT + bcrypt       | Stateless, dễ scale                   |
| AI/OCR     | Whisper API        | Chấm điểm speaking                    |
| Hosting    | Railway / Render   | PostgreSQL managed, CI/CD đơn giản    |

## System Overview
```
FE (Vercel) → REST API (Express) → PostgreSQL
                    ├── Auth middleware (JWT)
                    ├── RBAC middleware (Admin/Teacher/Student)
                    ├── /api/auth        → Auth module
                    ├── /api/users       → User management
                    ├── /api/classes     → Class & Exercise mgmt
                    ├── /api/exercises   → Exercise content
                    ├── /api/vocabulary  → Vocab & patterns
                    ├── /api/scores      → Score tracking
                    ├── /api/speaking    → Audio + Whisper AI
                    ├── /api/ocr         → OCR service
                    ├── /api/gamification→ Points, badges, streaks
                    └── /api/admin       → Admin management
```

## Database Schema (chính)
```
Users          — id, name, email, password, role, createdAt
Classes        — id, name, teacherId, studentIds[], createdAt
Exercises      — id, classId, title, type, status, gameConfig
Vocabulary     — id, exerciseId, word, meaning, audio, imageUrl
Patterns       — id, exerciseId, sentence, translation
Scores         — id, userId, exerciseId, score, completedAt
SpeakingResults— id, userId, exerciseId, audioUrl, aiScore, feedback
Gamification   — id, userId, totalPoints, stars, badges[], streak
AuditLog       — id, userId, action, target, createdAt
```

## API Overview
| Endpoint Group    | Methods             | Mô tả                      |
|-------------------|--------------------|-----------------------------|
| POST /api/auth    | login, register    | JWT auth                    |
| /api/users        | CRUD               | User management (Admin)     |
| /api/classes      | CRUD               | Class management (Teacher)  |
| /api/exercises    | CRUD + publish     | Exercise lifecycle          |
| /api/vocabulary   | CRUD               | Vocab & pattern content     |
| /api/scores       | GET, POST          | Score submission & ranking  |
| POST /api/speaking| submit, assess     | Audio upload + AI scoring   |
| POST /api/ocr     | recognize          | Image → text extraction     |
| /api/gamification | GET, POST          | Points, badges, leaderboard |
| /api/admin        | users, audit       | Admin panel                 |

## Môi trường
- dev:        localhost:3000
- staging:    https://___
- production: https://___

## Quyết định kỹ thuật quan trọng
<!-- Ghi lại những quyết định lớn và lý do -->
