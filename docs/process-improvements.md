# Process Improvement Manifest — Shine AI Studio

Tài liệu này ghi lại toàn bộ các cải tiến quy trình phát triển được áp dụng từ Sprint 7 trở đi, nhằm ngăn chặn "ghost work" (agent báo hoàn thành trong khi thực tế chỉ là mock).

---

## 🔴 Nguyên Nhân Gốc Rễ Của Vấn Đề

Agent trong các Sprint 1–6 có xu hướng:
1. Tạo UI shell HTML đẹp → báo "implemented"
2. Chạy `pnpm run build` pass → báo "verified"
3. Tự suy diễn logic → báo "follows specification"
4. Navigate URL thay vì test click tương tác → báo "E2E tested"
5. Không đọc reference projects → bỏ qua các library có sẵn
6. Bỏ qua chức năng cốt lõi (viral trend radar, analytics) vì không rõ yêu cầu

---

## ✅ Cải Tiến Được Áp Dụng Từ Sprint 7

### 1. Mandatory Pre-Read Gate (Bắt Buộc Đọc Trước)

**Quy tắc**: Trước khi viết bất kỳ dòng code nào, agent PHẢI đọc và trích xuất pattern từ các reference projects. Phải nộp file `scratch/research-notes.md` tóm tắt những gì đọc được.

**Reference Projects cần đọc**:
- `apps/shine/tmp/Toonflow-app-master/` — AI agent pipeline, skill prompts
- `apps/shine/tmp/LocalMiniDrama-main/` — AI services, storyboard pipeline
- `apps/shine/tmp/Jellyfish-main/` — State machine, background tasks
- `apps/shine/tmp/BigBanana-AI-Director-main/` — AI Director prompt chain
- `apps/vue-editor/src/` — OpenVideo real implementation

---

### 2. Checkpoint Gates Between Micro-Sprints (Cổng Kiểm Tra)

**Quy tắc**: Sprint được chia thành 5 micro-sprints. Mỗi micro-sprint có một Gate — tất cả hàng trong `sprint-7-tracker.md` phải là ✅ trước khi chuyển sang bước tiếp theo.

**Cấu trúc Micro-Sprint**:
```
Micro-Sprint 7.1: Auth API + Dashboard (Days 1–2) → [GATE 7.1]
Micro-Sprint 7.2: OpenVideo Canvas + Timeline (Days 3–4) → [GATE 7.2]
Micro-Sprint 7.3: AI Agent Services + Skills Library (Days 5–7) → [GATE 7.3]
Micro-Sprint 7.4: Viral Trend Radar + Analytics (Days 8–9) → [GATE 7.4]
Micro-Sprint 7.5: E2E Testing + Bug Fix (Day 10) → [GATE 7.5 = Sprint Done]
```

---

### 3. Mock Data Quality Linter (`pnpm run check-quality`)

**Script**: [`client/scripts/check-quality.js`](../client/scripts/check-quality.js)

**Phát hiện tự động**:
- Hardcoded object array với `label/title/name/id` trong Vue components
- `ref([{...}])` hoặc `reactive([{...}])` — reactive mock arrays
- `EditPage.vue` không có `@openvideo/core`, `@openvideo/engine-pixi` imported
- `server/src/skills/` thiếu skill prompt files bắt buộc
- Hardcoded `localhost` URLs thay vì biến môi trường

**Chạy**: Bắt buộc tại mỗi Gate checkpoint.

---

### 4. API Contract First (Hợp Đồng API Trước)

**Quy tắc**: Trước khi implement bất kỳ route mới nào, phải cập nhật `apps/shine/server/openapi.yaml` với đầy đủ request/response schema. Frontend generate typed client từ spec, không viết tay.

**Mẫu từ Jellyfish AGENTS.md**: *"API 变更后，必须运行 `pnpm run openapi:update` 同步 OpenAPI 接口"*

---

### 5. Database Schema First (Schema DB Trước)

**Quy tắc**: Tạo migration SQL file TRƯỚC khi viết bất kỳ service code nào.

**Thứ tự bắt buộc**:
```
1. Tạo migration file (migrations/xxx_feature.sql)
2. Chạy migration và verify schema
3. Viết repository/db layer
4. Viết service layer (business logic)
5. Viết API route layer
6. Viết Vue component + Pinia store
```

---

### 6. Centralized Skills Library (Thư Viện Prompt Tập Trung)

**Quy tắc**: Tất cả AI prompt templates PHẢI sống trong `apps/shine/server/src/skills/` dưới dạng file `.md` có version. Cấm hardcode prompt string trong service code.

**Files bắt buộc**:
```
server/src/skills/
├── script_decision.md
├── script_skeleton.md
├── script_scene.md
├── production_frame_prompt.md
├── production_storyboard.md
├── trend_radar.md
└── compliance_check.md
```

**Nguồn**: Port từ `apps/shine/tmp/Toonflow-app-master/data/skills/`

---

### 7. Progress Streaming Architecture (Streaming Tiến Trình)

**Quy tắc**: Tất cả long-running AI operations PHẢI stream tiến trình về client qua Socket.io. Không được để người dùng chờ không có phản hồi.

**Event schema**:
```typescript
// Server → Client via Socket.io
type ProgressEvent = {
  type: 'script:thinking' | 'script:skeleton_done' | 'script:scene_done'
      | 'production:frame_prompted' | 'render:progress' | 'render:done';
  percent?: number;
  message?: string;
  data?: unknown;
}
```

---

### 8. Honest Completion Tracker (Theo Dõi Trung Thực)

**File**: [`docs/sprint-7-tracker.md`](../docs/sprint-7-tracker.md)

**Quy tắc**: Agent PHẢI cập nhật tracker sau mỗi task với:
- ✅ REAL: Hoàn thành thực sự, có evidence (log output, API response, screenshot)
- ⚠️ PARTIAL: Một phần — vẫn còn mock data
- ❌ BLOCKED: Bị chặn, kèm mô tả blocker cụ thể
- 🚧 WIP: Đang thực hiện

**Cấm**: Báo ✅ khi thực tế feature vẫn là mock hoặc chưa implement.

---

### 9. E2E Testing Protocol (Giao Thức Kiểm Thử)

**Quy tắc**: Kiểm thử chức năng PHẢI thực hiện theo chuỗi thao tác click của người dùng thực tế. Cấm dùng URL navigation shortcuts để giả lập testing.

**Mẫu E2E đúng**:
```
1. Mở trình duyệt tại /auth/signup
2. Fill Name field: "Test User"
3. Fill Email field: "test@shine.ai"
4. Fill Password: "SecurePass123!"
5. Click "Create Account" button
6. Assert: loading spinner xuất hiện
7. Assert: API POST /v1/auth/signup được gọi (kiểm tra Network tab)
8. Assert: JWT token lưu vào localStorage['shine_token']
9. Assert: Redirect tự động đến /dashboard
10. Assert: Dashboard grid hiển thị empty state (chưa có series)
```

**Mẫu E2E sai** (cấm):
```
// Navigate trực tiếp đến URL — không verify được auth flow
window.location.href = '/dashboard'
```

---

### 10. Failure Reporting Protocol (Báo Cáo Thất Bại Trung Thực)

**Quy tắc**: Nếu một feature không thể implement do thiếu API keys, thiếu infrastructure, hoặc thư viện không hỗ trợ, agent PHẢI báo cáo blocker cụ thể thay vì báo success.

**Mẫu báo cáo đúng**:
```
Feature: POST /v1/ai/voice-gen
Status: ❌ BLOCKED
Blocker: VERTEX_AI_API_KEY không được cấu hình trong .env
Action needed: Thêm VERTEX_AI_API_KEY vào apps/shine/server/.env
```

---

## 📋 Checklist Trước Khi Bắt Đầu Sprint

- [ ] Đọc toàn bộ reference projects trong `apps/shine/tmp/`
- [ ] Nộp `scratch/research-notes.md` tóm tắt patterns đã rút ra
- [ ] Xác nhận `apps/shine/server/.env` có các API keys cần thiết
- [ ] `pnpm run check-i18n` pass (baseline trước khi bắt đầu)
- [ ] `pnpm run build` pass (baseline trước khi bắt đầu)
- [ ] Mở [`docs/sprint-7-tracker.md`](../docs/sprint-7-tracker.md) và update status theo từng task
