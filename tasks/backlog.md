# Backlog — BE Web Tiếng Anh 50M

## TASK-BE-001 — Project setup & CI/CD
Priority: P0 (Phase 0)
Mô tả: Init Express app, Prisma, ESLint, CI/CD pipeline
Spec: openspec/changes/be-0.1-setup/
Estimate: 1 ngày

## TASK-BE-002 — Database schema design
Priority: P0 (Phase 0)
Mô tả: Prisma schema: Users, Classes, Exercises, Vocabulary, Scores
Spec: openspec/changes/be-0.2-db-schema/
Estimate: 1 ngày

## TASK-BE-003 — REST API contract & RBAC middleware
Priority: P0 (Phase 0)
Mô tả: API conventions, JWT auth middleware, RBAC (Admin/Teacher/Student)
Spec: openspec/changes/be-0.3-api-rbac/
Estimate: 2 ngày

## TASK-BE-004 — Class & Exercise management APIs
Priority: P1 (Phase 1)
Mô tả: CRUD classes, exercises, assign students
Spec: openspec/changes/be-1.1-class-exercise-api/
Estimate: 2 ngày

## TASK-BE-005 — Vocabulary & pattern input APIs
Priority: P1 (Phase 1)
Mô tả: CRUD vocabulary, sentence patterns, bulk import
Spec: openspec/changes/be-1.2-vocab-pattern/
Estimate: 2 ngày

## TASK-BE-006 — OCR text recognition integration
Priority: P1 (Phase 1)
Mô tả: Accept image/PDF upload, call OCR API, return extracted text
Spec: openspec/changes/be-1.3-ocr/
Estimate: 2 ngày

## TASK-BE-007 — OCR content assignment to vocab/pattern groups
Priority: P1 (Phase 1)
Mô tả: API để teacher gán text đã OCR vào từng nhóm vocab/pattern
Spec: openspec/changes/be-1.4-ocr-assign/
Estimate: 1 ngày

## TASK-BE-008 — Exercise publishing & game configuration
Priority: P1 (Phase 1)
Mô tả: Publish exercise, cấu hình game mode, giao cho lớp
Spec: openspec/changes/be-1.5-publish-game/
Estimate: 1 ngày

## TASK-BE-009 — Vocabulary learning with progress tracking
Priority: P2 (Phase 2)
Mô tả: API track tiến độ từng từ của học sinh
Spec: openspec/changes/be-2.1-vocab-progress/
Estimate: 1 ngày

## TASK-BE-010 — Flashcard study system (3 modes)
Priority: P2 (Phase 2)
Mô tả: API serve flashcard data theo mode, track completion
Spec: openspec/changes/be-2.2-flashcard/
Estimate: 1 ngày

## TASK-BE-011 — Multiple-choice quiz APIs
Priority: P2 (Phase 2)
Mô tả: Generate quiz từ vocab/pattern, validate answers, store scores
Spec: openspec/changes/be-2.3-quiz/
Estimate: 2 ngày

## TASK-BE-012 — Audio processing & AI speaking assessment
Priority: P2 (Phase 2)
Mô tả: Accept audio upload, gửi Whisper AI, trả về score + feedback
Spec: openspec/changes/be-2.4-speaking-ai/
Estimate: 3 ngày

## TASK-BE-013 — Gamification system
Priority: P2 (Phase 2)
Mô tả: Tính điểm, sao, badges unlock, streak tracking
Spec: openspec/changes/be-2.5-gamification/
Estimate: 2 ngày

## TASK-BE-014 — Student ranking leaderboards
Priority: P3 (Phase 3)
Mô tả: Leaderboard theo lớp, tuần/tháng, overall
Spec: openspec/changes/be-3.1-leaderboard/
Estimate: 1 ngày

## TASK-BE-015 — Teacher score statistics
Priority: P3 (Phase 3)
Mô tả: Thống kê điểm theo lớp, bài tập, học sinh
Spec: openspec/changes/be-3.2-teacher-stats/
Estimate: 1 ngày

## TASK-BE-016 — AI speaking assessment (Whisper advanced)
Priority: P3 (Phase 3)
Mô tả: Nâng cao chấm điểm pronunciation accuracy, fluency
Spec: openspec/changes/be-3.3-whisper-advanced/
Estimate: 2 ngày

## TASK-BE-017 — Admin user management & audit logging
Priority: P3 (Phase 3)
Mô tả: Admin CRUD users, phân role, audit log mọi action
Spec: openspec/changes/be-3.4-admin/
Estimate: 2 ngày
