# [2.5] API Game Hóa – Điểm, Sao & Thành Tích

**Người phụ trách:** Trần Minh Vĩ | **Deadline:** 15/07/2026 | **Ưu tiên:** Trung bình

---

## Endpoints

```
POST /api/student/score/add
Body: { type: 'VOCAB'|'SENTENCE'|'QUIZ'|'SPEAKING', exerciseId, stars: number }
Response: { totalStars, newBadges: string[], level }

GET  /api/student/achievements
Response: { badges: [{ id, name, description, unlocked, unlockedAt }], level, totalStars, streak }

GET  /api/student/streak
Response: { currentStreak: number, lastStudiedDate: Date }
```

## Việc cần làm

### DB Model
```prisma
model StudentStats {
  id         String @id @default(cuid())
  userId     String @unique
  totalStars Int    @default(0)
  level      Int    @default(1)
  streak     Int    @default(0)
  lastStudied DateTime?
}

model Badge {
  id          String @id @default(cuid())
  userId      String
  badgeType   BadgeType
  unlockedAt  DateTime @default(now())
  @@unique([userId, badgeType])
}

enum BadgeType {
  STREAK_7    // 7 ngày liên tiếp
  EXERCISES_10 // 10 bài hoàn thành
  SPEAKING_5   // 5 lần 100% speaking
  VOCAB_100    // 100 từ đã thuộc
}
```

### Service (`gamification.service.ts`)
- [ ] `addStars(userId, stars)` – cộng sao, check level up (mỗi 50 sao)
- [ ] `checkBadges(userId)` – check tất cả điều kiện badge, unlock nếu đủ
- [ ] `updateStreak(userId)` – cập nhật streak (nếu học hôm nay và hôm qua)

## Tiêu chí hoàn thành
- [ ] Sao cộng đúng, không bị duplicate
- [ ] Level tăng đúng mốc 50 sao
- [ ] Badges unlock đúng điều kiện
- [ ] Streak tính đúng (reset nếu bỏ 1 ngày)