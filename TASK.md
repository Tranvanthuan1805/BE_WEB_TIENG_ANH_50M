# [0.2] Thiết Kế DB Schema

**Người phụ trách:** Trần Văn Thuần | **Deadline:** 18/06/2026 | **Ưu tiên:** Cao
**Phụ thuộc:** Task 0.1 hoàn thành

---

## Việc cần làm

### Prisma Schema (`prisma/schema.prisma`)

#### Users
```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(STUDENT)
  classId   String?
  createdAt DateTime @default(now())
}
enum Role { ADMIN TEACHER STUDENT }
```

#### Class
```prisma
model Class {
  id        String     @id @default(cuid())
  name      String
  teacherId String
  students  User[]
  exercises Exercise[]
}
```

#### Exercise
```prisma
model Exercise {
  id          String   @id @default(cuid())
  title       String
  description String?
  classId     String
  status      Status   @default(DRAFT)
  publishedAt DateTime?
  vocab       Vocab[]
  sentences   Sentence[]
}
enum Status { DRAFT PUBLISHED }
```

#### Vocab & Sentence
```prisma
model Vocab {
  id         String   @id @default(cuid())
  exerciseId String
  word       String
  meaning    String
  example    String?
}
model Sentence {
  id          String  @id @default(cuid())
  exerciseId  String
  content     String
  translation String
}
```

#### Score
```prisma
model Score {
  id         String   @id @default(cuid())
  userId     String
  exerciseId String
  type       ScoreType
  score      Float
  createdAt  DateTime @default(now())
}
enum ScoreType { VOCAB SENTENCE QUIZ SPEAKING }
```

### Migration
- [ ] `npx prisma migrate dev --name init`
- [ ] `npx prisma generate`
- [ ] Seed data mẫu cho dev/testing

## Tiêu chí hoàn thành
- [ ] Schema migrate thành công
- [ ] Quan hệ giữa các bảng đúng
- [ ] Seed data tạo được user test (admin, teacher, student)