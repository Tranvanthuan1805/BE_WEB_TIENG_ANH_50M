# Quy Trình Phát Triển Phần Mềm

> **Dành cho ai:** Mọi thành viên trong team.
> **Mục đích:** Mỗi dự án client đều chạy theo một chuẩn thống nhất, tránh scope creep và bàn giao lộn xộn.
>
> Copy file này vào root của mỗi project mới.
> Đọc từ đầu đến cuối một lần trước khi bắt tay vào làm.

---

## Mục lục

1. [Setup project mới](#1-setup-project-mới)
2. [Phase 1 — Intake](#2-phase-1--intake)
3. [Phase 2 — Planning](#3-phase-2--planning)
4. [Phase 3 — Design](#4-phase-3--design)
5. [Phase 4 — Development](#5-phase-4--development)
6. [Phase 5 — Delivery](#6-phase-5--delivery)
7. [Quy tắc Git](#7-quy-tắc-git)
8. [Quản lý task](#8-quản-lý-task)
9. [Xử lý tình huống thường gặp](#9-xử-lý-tình-huống-thường-gặp)
10. [Nguyên tắc cốt lõi](#10-nguyên-tắc-cốt-lõi)

---

## 1. Setup project mới

Làm ngay khi nhận dự án, trước khi làm bất cứ thứ gì khác.

```bash
# Cài OpenSpec — quản lý spec và feature, lưu giữ context cho các agent có thể hiểu
npm install -g @fission-ai/openspec@latest
openspec init

# Cài UI UX Pro Max — design intelligence
npm install -g uipro-cli
uipro init --ai claude      # Claude Code
uipro init --ai cursor      # Cursor
```

Tạo cấu trúc thư mục chuẩn:

```
[ten-project]/
├── workflow_agent.md         ← file này
├── docs/
│   ├── brief.md              ← brief từ client (Phase 1)
│   ├── architecture.md       ← kiến trúc hệ thống (Phase 2)
│   └── handover.md           ← bàn giao (Phase 5)
├── design-system/
│   └── MASTER.md             ← design system (Phase 3)
├── openspec/                 ← do OpenSpec tạo tự động
└── tasks/
    ├── backlog.md            ← toàn bộ tasks chưa vào sprint
    └── sprint-current.md     ← tasks đang chạy
```

> Giữ đúng cấu trúc này: mọi file đều có chỗ quy định sẵn, dễ bàn giao và để AI đọc context.

---

## 2. Phase 1 — Intake

**Output cần có:** Brief đã confirm + SOW được ký

**Tại sao quan trọng:** Phần lớn dự án thất bại không phải vì code kém — mà vì hiểu sai yêu cầu từ đầu. Một giờ clarify ở Phase 1 tiết kiệm nhiều ngày làm lại ở Phase 4.

---

### Bước 1 — Họp intake với client

Hỏi theo thứ tự, ghi chép đầy đủ:

```
VỀ BÀI TOÁN:
□ Vấn đề bạn đang gặp phải là gì?
□ Hiện tại đang giải quyết vấn đề đó như thế nào?
□ Tại sao cần giải quyết bây giờ?

VỀ SẢN PHẨM:
□ Cần build gì? (web app / mobile app / API / khác)
□ Ai sẽ dùng? (mô tả user cụ thể)
□ Nếu chỉ có 3 tính năng quan trọng nhất — đó là gì?
□ Có hệ thống cũ nào cần tích hợp không?

VỀ KỸ THUẬT:
□ Tech stack mong muốn (nếu có)?
□ Deploy ở đâu? Cloud hay server riêng?
□ Yêu cầu đặc biệt về bảo mật? (dữ liệu nhạy cảm, GDPR...)

VỀ TIMELINE & BUDGET:
□ Deadline cứng nào không thể trễ?
□ Budget range?
□ Ưu tiên: ship nhanh / chất lượng cao / tiết kiệm chi phí?
```

> Nếu client không trả lời được câu hỏi nào → ghi lại, đánh dấu "cần clarify". Không được tự assume.

---

### Bước 2 — Viết brief

Lưu vào `docs/brief.md`:

```markdown
# Brief — [Tên dự án]
Ngày: [DD/MM/YYYY]   |   Client: [Tên]   |   Người thực hiện: [Tên bạn / công ty]

## Vấn đề client đang gặp
[2-3 câu mô tả bài toán]

## Sản phẩm cần build
[2-3 câu mô tả sản phẩm]

## Must-have features
- [Feature 1]
- [Feature 2]

## Out of scope (QUAN TRỌNG)
- [Những gì client KHÔNG cần lần này]

## Timeline & Budget
- Deadline: [ngày]
- Budget: [range]

## Câu hỏi cần clarify
- [ ] [Câu hỏi chưa có trả lời]
```

Gửi brief cho client xác nhận qua email trước khi viết SOW.

---

### Bước 3 — SOW (Statement of Work)

SOW là văn bản xác định phạm vi công việc. Phải có:
- Danh sách features sẽ deliver (cụ thể)
- Danh sách những gì **không** bao gồm (out of scope)
- Timeline theo milestones
- Payment schedule
- Điều khoản change request — thay đổi scope sẽ tính thêm phí

**Client ký SOW = Gate 1 ✅ → bắt đầu Phase 2**

> ⛔ KHÔNG bắt đầu Phase 2 khi chưa có SOW ký. Nếu client nói "cứ làm đi rồi ký sau" — đây là red flag: dừng lại, thống nhất scope và thanh toán theo milestone rõ ràng trước khi code.

---

## 3. Phase 2 — Planning

**Output cần có:** PRD + Architecture doc được client approve

**Tại sao quan trọng:** Bạn và client phải đồng ý về "cái gì sẽ được build" và "build như thế nào" — trước khi viết một dòng code.

---

### Bước 1 — Viết PRD bằng OpenSpec

PRD (Product Requirements Document) mô tả chi tiết sản phẩm. Dùng OpenSpec:

```bash
/opsx:propose "[mô tả feature hoặc toàn bộ product]"
```

**Ví dụ:**
```
/opsx:propose "hệ thống quản lý đơn hàng cho cửa hàng thời trang online:
- khách hàng đặt hàng, thanh toán online
- admin quản lý đơn, cập nhật trạng thái
- tích hợp gửi email thông báo"
```

OpenSpec tạo ra `openspec/changes/[tên]/`:
```
proposal.md   ← Why & What
specs/        ← Requirements chi tiết từng feature
design.md     ← Technical approach
tasks.md      ← Danh sách tasks để implement
```

Bạn review, chỉnh lại cho đúng brief, bổ sung **Out of Scope** rõ ràng.

**Acceptance criteria — tốt vs xấu:**
```
❌ Xấu: "Hệ thống phải nhanh"
✅ Tốt: "API response time < 500ms, tối đa 100 concurrent users"

❌ Xấu: "Admin quản lý được đơn hàng"
✅ Tốt: "Admin xem danh sách đơn, lọc theo trạng thái/ngày,
         cập nhật trạng thái, export CSV"
```

---

### Bước 2 — Viết Architecture doc

Viết `docs/architecture.md`. Không cần dài — cần đủ để sau này bạn (hoặc người nhận bàn giao) đọc vào biết build và vận hành thế nào.

```markdown
# Architecture — [Tên dự án]

## Tech Stack
| Layer    | Lựa chọn    | Lý do                  |
|----------|-------------|------------------------|
| Frontend | [framework] | [lý do ngắn gọn]       |
| Backend  | [framework] | [lý do]                |
| Database | [DB]        | [lý do]                |
| Hosting  | [cloud]     | [lý do]                |

## System Overview
[Diagram ASCII hoặc Mermaid]

## Database Schema
[Bảng chính, cột quan trọng, quan hệ giữa các bảng]

## API Overview
[Endpoints chính, nhóm theo module]

## Môi trường
- dev:        local
- staging:    [URL] — test và demo client
- production: [URL] — live

## Quyết định kỹ thuật quan trọng
[Ghi lại những quyết định lớn và lý do — để sau này không phải đoán lại]
```

> Đọc lại architecture sau vài ngày: nếu chỗ nào mơ hồ với chính bạn → bổ sung ngay, đừng để đến lúc code rồi mới phát hiện thiếu hướng.

---

### Bước 3 — Client review & approve

Gửi PRD + Architecture cho client. Họp online 30–60 phút walk through từng phần.

**Client approve = Gate 2 ✅ → bắt đầu Phase 3**

> ⛔ KHÔNG bắt đầu Phase 3 khi chưa có client approve PRD. Nếu client thay đổi yêu cầu sau khi đã approve → đó là change request, tính phí thêm theo SOW.

---

## 4. Phase 3 — Design

**Output cần có:** Toàn bộ màn hình trong Figma (hoặc trong code), client sign-off.

**Tại sao quan trọng:** Vừa code vừa nghĩ UI sẽ tốn thời gian gấp đôi và kết quả không nhất quán. Design trước giúp phát hiện UX issues sớm — khi sửa còn rẻ.

---

### Dùng UI UX Pro Max

Skill tự động activate trong Claude Code khi request UI/UX. Mô tả tự nhiên:

```
Build a [loại sản phẩm] for [mô tả business].
Stack: [framework đang dùng]
```

**Ví dụ:**
```
Build an order management dashboard for a fashion e-commerce store.
Admin users need to view, filter, and update order statuses.
Stack: Next.js + Tailwind CSS
```

Skill generate design system phù hợp: style, màu sắc, typography, và anti-patterns cần tránh.

---

### Persist design system cho cả project

Chạy một lần, dùng làm nguồn tham chiếu UI cho mọi màn hình sau:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "[mô tả product]" \
  --design-system --persist -p "[Tên project]"
```

Tạo ra `design-system/MASTER.md` — **nguồn sự thật duy nhất về UI/UX** cho toàn project.

**Mỗi khi build UI đều nên đọc file này trước**, và dùng prompt:
```
Read design-system/MASTER.md first, then build [mô tả component/trang]
```

---

### Checklist trước khi chuyển Phase 4

Mỗi màn hình phải có đủ:
```
□ Default state    — hiển thị bình thường
□ Loading state    — đang load data
□ Empty state      — chưa có data
□ Error state      — lỗi xảy ra
□ Success state    — action thành công
□ Responsive       — mobile + desktop (nếu yêu cầu)
```

**Client sign-off toàn bộ màn hình = Gate 3 ✅ → bắt đầu Phase 4**

> ⛔ KHÔNG bắt đầu code một feature nếu màn hình đó chưa có đủ states. Thiếu → bổ sung với client / trong spec, không tự sáng tác UI.

---

## 5. Phase 4 — Development

**Mục tiêu:** Build features đúng spec, đúng design; tự kiểm thử kỹ trước khi merge; demo client theo nhịp đã thống nhất.

### Một "sprint" gợi ý khi làm solo (1–2 tuần)

```
Ngày 1      Lên kế hoạch & chọn task từ backlog
Ngày 2–8    Dev + check-in ngắn mỗi ngày (xem dưới)
Ngày 8–9    Kiểm thử trên staging
Ngày 9      Demo client
Ngày 10     Retro ngắn (ghi vào file)
```

---

### Lên kế hoạch (~1 giờ, đầu kỳ)

Mục tiêu: bạn biết rõ ưu tiên và definition of done cho kỳ này.

1. Lấy tasks từ `tasks/backlog.md`, chọn theo priority
2. Với mỗi task — viết spec bằng OpenSpec:
   ```bash
   /opsx:propose "[tên feature cụ thể]"
   ```
3. Ghi vào `tasks/sprint-current.md`:

```markdown
# Sprint [N] — [Ngày bắt đầu] → [Ngày kết thúc]

Sprint Goal: [1 câu — cuối sprint này deliver được gì]
Ví dụ: "Admin login được và quản lý đơn hàng cơ bản chạy trên staging"

| Task ID  | Mô tả                         | Status          |
|----------|-------------------------------|-----------------|
| TASK-001 | Login với email/password      | 🔄 In Progress  |
| TASK-002 | Danh sách đơn hàng + filter   | ⬜ Todo         |
| TASK-003 | Cập nhật trạng thái đơn       | ⬜ Todo         |
| TASK-004 | Gửi email notification        | ⬜ Todo         |
```

Status flow: `⬜ Todo → 🔄 In Progress → 👀 In Review → 🧪 QA → ✅ Done`

---

### Check-in hằng ngày (solo, ~5 phút)

Tự trả lời 3 câu — ghi vào `tasks/sprint-current.md` (cuối file) hoặc nhật ký riêng:

1. Hôm qua làm được gì?
2. Hôm nay sẽ làm gì?
3. Có bị block không?

Nếu có blocker → xử lý trong ngày (clarify với client, đổi thứ tự task, hoặc cắt scope tạm thời).

**Async với client** (nếu họ cần visibility) — có thể gửi tóm tắt ngắn:
```
📅 [Ngày]
✅ Hôm qua: TASK-001 — xong login UI, đang test
🔨 Hôm nay: TASK-001 — fix validation, tạo PR
🚧 Blocker: không có / [mô tả]
```

---

### Quy trình làm một task

**Bước 1 — Đọc trước khi code**

Bắt buộc đọc trước khi mở editor:
- `openspec/changes/[tên-feature]/specs/` — requirements chi tiết
- `openspec/changes/[tên-feature]/tasks.md` — danh sách việc cần làm
- `design-system/MASTER.md` — nếu task có UI
- `docs/architecture.md` — phần liên quan

Đọc xong mà vẫn không rõ cần làm gì → **email/message client hoặc ghi vào "cần clarify" trong spec** — đừng tự đoán.

---

**Bước 2 — Tạo branch**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/TASK-001-user-login
```

Format: `feature/[TASK-ID]-[mo-ta-ngan]` hoặc `fix/[TASK-ID]-[mo-ta-ngan]`

---

**Bước 3 — Implement**

Dùng OpenSpec để AI implement theo spec:
```bash
/opsx:apply
```

Nếu task có UI, luôn bắt đầu bằng:
```
Read design-system/MASTER.md first, then build [mô tả UI]
```

> **Quan trọng:** Luôn review kỹ output của AI trước khi commit. AI có thể sai — bạn chịu trách nhiệm với client về chất lượng deliverable.

---

**Bước 4 — Tự review trước khi tạo PR**

Chạy hết checklist này, không skip:

```
CODE QUALITY:
□ Đọc lại toàn bộ diff của mình một lần nữa
□ Không có console.log, debug code còn sót
□ Không có hardcoded strings — URL, magic number, credentials
□ Naming rõ ràng — đọc vào hiểu ngay, không cần comment giải thích

LOGIC & CORRECTNESS:
□ Code làm đúng những gì trong spec không?
□ Đã handle input rỗng / null chưa?
□ Đã handle lỗi (API fail, network error) chưa?
□ Form đã validate input chưa?

SECURITY:
□ Không có API key, password, secret nào trong code
□ Endpoint có check authentication chưa?
□ Có check authorization đúng role chưa?
   Ví dụ: user thường không được xóa data của user khác

DATABASE (nếu có):
□ Migration chạy được cả up lẫn down (rollback được)
□ Đã test migration trên local chưa?

TEST:
□ Đã test manual theo acceptance criteria trong spec chưa?
□ Đã viết unit test cho business logic quan trọng chưa?
```

---

**Bước 5 — Tạo PR**

```bash
git push origin feature/TASK-001-user-login
```

Tạo PR với description đầy đủ:

```markdown
## Task
TASK-001 — User Login

## Làm gì trong PR này
User có thể login bằng email/password.
Implement form validation, error handling, và redirect sau khi login thành công.

## Cách test
1. Vào /login
2. Nhập email và password hợp lệ → expect: redirect về dashboard
3. Nhập sai password → expect: hiện "Sai mật khẩu"
4. Submit form rỗng → expect: hiện validation errors

## Staging URL
https://staging.example.com/login

## Screenshots
[Before / After nếu có UI thay đổi]

## Checklist
- [x] Đã tự review code
- [x] Đã test manual
- [x] Không có hardcoded credentials
- [x] Migration chạy được (nếu có)
```

> PR mô tả sơ sài (chỉ ghi "fix bug" hay để trống) làm khó chính bạn khi quay lại sau và khó demo với client. Viết rõ = tiết kiệm thời gian.

Sau khi tạo PR → update task status: `👀 In Review`

---

### Review (solo)

Khi không có reviewer người thật, luồng tối thiểu là: **checklist tự review ở trên + AI review diff**.

Gợi ý prompt AI:
```
Review code này. Tìm bugs, security issues, performance problems.
Context: [mô tả feature]
Spec: [paste từ openspec/changes/[tên]/specs/]

[paste diff]
```

Format comment (áp dụng cho chính bạn / AI):

```
🔴 PHẢI SỬA — [Tên vấn đề]
[Mô tả vấn đề + cách sửa]

🟡 NÊN SỬA — [Tên vấn đề]
[Suggestion]

✅ TỐT — [Ghi nhận điểm tốt]
```

**Ví dụ comment cụ thể:**
```
🔴 PHẢI SỬA — Security

Line 45: Endpoint DELETE /orders/:id không check authentication.
Bất kỳ ai cũng có thể xóa đơn hàng mà không cần login.
Thêm auth middleware: router.delete('/:id', authMiddleware, handler)

🟡 NÊN SỬA — Performance

Line 78: Query tất cả orders rồi filter trong code.
Khi có nhiều data sẽ rất chậm. Filter ở DB level:
WHERE status = $1 AND created_at > $2

✅ TỐT — Error handling tốt ở line 92-98, rõ ràng và đúng cách.
```

Khi đã xử lý xong các 🔴 (và 🟡 nếu đồng ý) → merge vào `develop` → update task: `🧪 QA`

*(Nếu hợp đồng yêu cầu review bởi bên thứ ba, thêm bước gửi PR cho họ trước khi merge.)*

---

### QA

Deploy `develop` lên staging sau mỗi merge.

**Tạo test cases bằng AI:**
```
Generate test cases for this feature.
Include: happy path, validation errors, edge cases, unauthorized access.
Spec: [paste từ openspec/changes/[tên]/specs/]
```

**Ghi kết quả test:**

```markdown
# QA — TASK-001 User Login

| # | Test case                    | Expected                      | Status |
|---|------------------------------|-------------------------------|--------|
| 1 | Login đúng email/password    | Redirect về dashboard         | ✅ Pass |
| 2 | Sai password                 | Hiện "Sai mật khẩu"           | ✅ Pass |
| 3 | Email không tồn tại          | Hiện "Tài khoản không tồn tại"| ❌ Fail |
| 4 | Submit form rỗng             | Hiện validation errors        | ✅ Pass |
| 5 | Truy cập /dashboard không login | Redirect về /login          | ✅ Pass |
```

**Bug report khi phát hiện lỗi:**

```markdown
## BUG-001 — Login sai email vẫn hiện "Sai mật khẩu"

Severity: 🟡 Medium
Task: TASK-001

Steps to reproduce:
1. Vào /login
2. Nhập email không tồn tại + password bất kỳ
3. Click Đăng nhập

Expected: "Tài khoản không tồn tại"
Actual:   "Sai mật khẩu" — gây confuse và tiết lộ thông tin

Evidence: [screenshot]
Environment: Chrome 120, macOS, chưa login
```

**Severity guide:**

| Mức | Ý nghĩa | Ví dụ |
|-----|---------|-------|
| 🔴 Critical | Không dùng được / mất data / security hole | Không login được, thanh toán lỗi |
| 🟠 High | Tính năng chính bị hỏng | Filter không hoạt động, email không gửi |
| 🟡 Medium | Lỗi nhưng có cách đi vòng | Sort sai, UI lệch nhẹ |
| 🟢 Low | Cosmetic, typo, edge case hiếm | Lỗi chính tả, icon lệch 2px |

> Critical bug trên staging/production → **thông báo client ngay** (và ghi rõ impact), không gom đến cuối tuần.

QA pass → update task: `✅ Done`

---

### Client Demo (Cuối sprint, ~45 phút)

**Chuẩn bị:**
- Deploy staging đầy đủ features của sprint
- Test demo flow một lần trước khi họp
- Chuẩn bị data demo thực tế — không dùng "test123" hay lorem ipsum

**Cấu trúc:**
```
[5 phút]  Sprint summary — làm được gì
[25 phút] Demo features theo user flow
           Demo từ góc độ user, không giải thích technical:
           "Khi user click vào đây, họ thấy..."
[10 phút] Q&A
[5 phút]  Preview sprint tiếp theo
```

**Quan trọng:**
- Demo trên staging — không phải localhost
- Feature chưa xong → nói thẳng, không demo feature đang lỗi
- Record và share cho client — tránh tranh cãi sau này

---

### Retro (Sau demo, ~15–30 phút)

Mỗi sprint nên có retro ngắn — với solo dev là **tự phản chiếu có cấu trúc**:

```
[5 phút]  Ghi lại:
           - 1-2 điều sprint này làm tốt
           - 1-2 điều cần cải thiện

[10 phút] Chốt tối đa 3 action items cụ thể (công việc + deadline)

[5 phút]  Cập nhật backlog / estimate nếu pattern lặp lại
```

Lưu vào `tasks/retro-sprint-[N].md`.

> Bỏ retro = lặp lại lỗi quy trình (scope, clarify, deploy). Một chục phút retro thường rẻ hơn nhiều giờ vá sau.

---

### Gate 4 — UAT

Trước khi release production, client tự test trên staging.

Điều kiện pass Gate 4:
- 0 bug Critical còn mở
- 0 bug High còn mở
- Client xác nhận "OK, cho lên production"

**Gate 4 ✅ → bắt đầu Phase 5**

> ⛔ KHÔNG deploy production khi còn Critical/High bug. Bị deadline ép → thương lượng lại scope hoặc ngày UAT với client, không tự ship bug để "kịp".

---

## 6. Phase 5 — Delivery

**Output cần có:** Production live ổn định + client ký handover doc

---

### Deploy Production

Chạy từng mục, không skip:

```
TRƯỚC KHI DEPLOY:
□ CI/CD pipeline green — tất cả tests pass
□ Backup database production đã chạy và VERIFY được (thử restore thử)
□ Migration đã test trên staging ít nhất 1 ngày
□ Env variables production đúng — không có giá trị staging/test
□ Không có hardcoded credentials trong code
□ Client đã được thông báo nếu có downtime
□ Biết cách rollback về version trước trong < 15 phút

TRONG KHI DEPLOY:
□ Chạy migration
□ Deploy application
□ Health check OK

SAU KHI DEPLOY — 15 phút đầu (QUAN TRỌNG):
□ Smoke test: login được, flow chính chạy được
□ Error rate bình thường (< 1%)
□ Response time bình thường
```

> **Rule vàng:** Nếu có vấn đề trong 15 phút đầu → **rollback ngay, debug sau.** Đừng cố fix nhanh trên production.

---

### Handover Document

Viết `docs/handover.md`. Phải đủ để người nhận bàn giao phía client (hoặc dev khác) đọc vào setup được mà không cần hỏi lại hàng chục câu.

```markdown
# Handover — [Tên dự án]
Ngày: [DD/MM/YYYY]   |   Prepared by: [Tên công ty / bạn]

## 1. Môi trường & Access
| Môi trường   | URL            | Tài khoản                          |
|-------------|----------------|------------------------------------|
| Production  | https://...    | Bàn giao qua password manager      |
| Staging     | https://...    | Bàn giao qua password manager      |
| Admin panel | https://.../admin | Bàn giao qua password manager   |
| Cloud       | AWS/GCP/Azure  | Bàn giao qua password manager      |

⚠️ KHÔNG gửi credentials qua email hay chat.
   Dùng Bitwarden / 1Password / LastPass để bàn giao.

## 2. Source Code
| Repo      | URL            | Branch chính |
|-----------|----------------|-------------|
| Frontend  | github.com/... | main        |
| Backend   | github.com/... | main        |

### Chạy local
[Các bước cụ thể để chạy trên máy dev mới — đủ chi tiết]

## 3. Tech Stack
| Layer    | Technology | Version |
|----------|-----------|---------|
| ...      | ...       | ...     |

## 4. Deploy
[Các bước deploy — đủ chi tiết để người không biết cũng làm được]

## 5. Environment Variables
| Variable     | Mô tả                | Ví dụ          |
|-------------|----------------------|----------------|
| DATABASE_URL | Kết nối database     | postgres://... |
| ...          | ...                  | ...            |

## 6. Third-party Services
| Service  | Mục đích    | Tài khoản               |
|----------|-------------|-------------------------|
| [Stripe] | Thanh toán  | Client tự quản lý       |
| ...      | ...         | ...                     |

## 7. Known Issues
| Vấn đề    | Severity | Workaround |
|-----------|----------|-----------|
| ...       | Low      | ...       |

## 8. Warranty & Support
- Warranty: [X tháng] từ ngày bàn giao — fix bugs miễn phí
- Sau warranty: liên hệ [email] để báo giá
```

**Client ký handover doc = Gate 5 ✅ → project closed**

---

## 7. Quy tắc Git

### Branching model

```
main              ← Production. Chỉ merge từ release/hotfix. KHÔNG commit trực tiếp.
  └── develop     ← Integration. Base để tạo feature branches.
        ├── feature/TASK-001-user-login
        ├── feature/TASK-002-order-list
        └── fix/TASK-015-null-order-crash
```

### Commit message format

```
[type]: [mô tả ngắn gọn] [TASK-ID]

type:
  feat     — tính năng mới
  fix      — bug fix
  refactor — tái cấu trúc code (không thêm feature, không fix bug)
  test     — thêm/sửa tests
  docs     — cập nhật documentation
  chore    — build process, dependencies
```

**Ví dụ:**
```
✅ feat: add user login with email/password [TASK-001]
✅ fix: null pointer when order has no items [TASK-015]
✅ refactor: extract payment logic to PaymentService [TASK-022]

❌ fix bug
❌ update code
❌ wip
❌ asdasd
```

### Quy tắc PR

- Merge từ `feature/*` hoặc `fix/*` vào `develop`
- **Trước khi merge:** hoàn tất checklist tự review + pass AI review (và peer review nếu hợp đồng có yêu cầu)
- PR > 400 dòng thay đổi → **nên tách** thành nhỏ hơn (dễ review và rollback)
- Xử lý feedback trong thời gian hợp lý — đừng để PR treo quá lâp
- Delete branch sau khi merge

---

## 8. Quản lý task

Chưa có tool chuyên dụng — dùng markdown files trong repo:

```
tasks/
├── backlog.md           ← Tất cả tasks chưa vào sprint
├── sprint-current.md    ← Tasks sprint đang chạy
└── retro-sprint-[N].md  ← Retrospective notes
```

**Format task trong backlog.md:**

```markdown
## TASK-001 — User Login
Priority: P0 (must have sprint 1)
Mô tả: User login bằng email/password, có remember me
Spec: openspec/changes/user-login/
Estimate: 3 ngày

## TASK-002 — Order List
Priority: P0 (must have sprint 1)
Mô tả: Admin xem danh sách đơn, filter theo status/ngày
Spec: openspec/changes/order-list/
Estimate: 2 ngày
```

> Khi workload tăng hoặc nhiều dự án song song, có thể chuyển sang Linear / Jira — file markdown vẫn có thể sync hoặc link task ID.

---

## 9. Xử lý tình huống thường gặp

### Client muốn thêm feature giữa sprint

1. **Không** tự ý nhét vào đúng batch đang chạy nếu chưa thống nhất
2. Ghi vào `tasks/backlog.md`
3. Đánh giá: feature có trong SOW không?
   - Có → xếp vào sprint sau theo priority
   - Không → đây là change request, estimate và báo giá thêm
4. Thông báo client về impact timeline

---

### Bug critical trên production

1. Thông báo client **ngay** (và ghi nhận thời điểm) — không gom đến hôm sau
2. Quyết định: hotfix hay rollback?
3. Nếu hotfix:
   ```bash
   git checkout -b fix/TASK-XXX-ten-bug main
   # fix → PR → merge vào main VÀ develop
   ```
4. Deploy hotfix
5. Viết incident report ngắn: bug là gì, root cause, fix ra sao, phòng tránh tương lai

---

### Spec không rõ, không biết implement thế nào

1. Đọc lại `openspec/changes/[tên]/specs/` kỹ hơn
2. Vẫn không rõ → hỏi client (hoặc ghi rõ câu hỏi chờ trả lời) — **không tự đoán**
3. Cập nhật spec sau khi có câu trả lời rõ ràng
4. Không bao giờ bắt đầu code khi spec còn mơ hồ

---

### Bị block vì đợi phía client / tích hợp bên thứ ba

1. Ghi blocker vào check-in ngay — không để im
2. Nhắc client / đối tác theo kênh đã thống nhất; song song pick task khác từ backlog có thể làm độc lập

---

### PR / diff nhận nhiều 🔴 comment (từ AI hoặc reviewer)

1. Đọc kỹ từng comment trước khi phản hồi — đừng defend ngay
2. Sửa tất cả 🔴 comments
3. Với 🟡 — có thể thảo luận, nhưng phải giải thích rõ nếu không sửa
4. Re-review sau khi address xong
5. Review không phải chỉ trích cá nhân — mục đích là làm deliverable tốt hơn

---

## 10. Nguyên tắc cốt lõi

**Spec trước, code sau**
Không viết một dòng code khi chưa có spec rõ ràng. Dùng `/opsx:propose` → tự review / AI review → client approve → mới code. 30 phút viết spec tiết kiệm nhiều ngày làm lại.

**Không assume**
Không biết → hỏi client (qua email có vết) hoặc ghi vào backlog clarify. Assume sai rồi code xong còn tệ hơn là dừng lại hỏi.

**Gate không bypass**
5 quality gates là checkpoints bắt buộc. Dù deadline gấp đến đâu. Bypass gate = rủi ro uy tín và tranh chấp sau này.

**Document mọi quyết định quan trọng**
Quyết định kỹ thuật lớn → ghi vào architecture doc. Bug critical → viết incident report. Client yêu cầu thêm feature → ghi vào backlog + email confirm. Không documented = khó chứng minh đã thống nhất gì.

**AI là công cụ, không phải người quyết định**
Dùng OpenSpec, UI UX Pro Max, và AI tools để tăng tốc — nhưng luôn review output trước khi commit. AI có thể sai. Bạn chịu trách nhiệm với client về kết quả.

---

*Góp ý cải thiện workflow → chỉnh sửa file này trong repo hoặc fork template cho dự án sau.*
