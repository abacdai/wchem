# HAND//SCOPE — AGENTS.md

Dự án: WChem - VR Chemistry chạy trên trình duyệt (MediaPipe Hands + Matter.js + Canvas 2D).
File này KHÔNG thay thế `.github/copilot-instructions.md` — kiến trúc/invariant đầy đủ vẫn ở đó,
đây là bản OpenCode tự động nạp mỗi phiên (đọc `AGENTS.md` ở project root).

## Nguyên tắc bất biến (đọc trước khi sửa bất cứ gì)
- Không viết lại toàn bộ file. Chỉ sửa phần cần thiết, ưu tiên extend hàm có sẵn.
- Không tạo canvas thứ 2. Không thay MediaPipe. Không thay Matter.js.
- Mouse và pinch (tay) PHẢI dùng chung 1 logic sự kiện — không duplicate UI code.
- Validate sau mỗi thay đổi lớn (tối thiểu `node --check script.js`, không để biến/hàm chết).
- Thứ tự ưu tiên khi có nhiều việc: Hand Tracking → VR Menu → Camera/UI → Backend/Persist → Dọn dẹp.

## Bản đồ Skill theo tác vụ

| Khi làm việc này... | Dùng | Vì sao |
|---|---|---|
| Thiết kế/chỉnh UI: màu, layout, VR menu, HUD, panel nguyên tố | **ui-ux-pro-max-skill** | Sinh design system nhất quán (màu/font/spacing/anti-pattern), tránh trôi khỏi theme HUD machine-vision hiện tại của HAND//SCOPE |
| Cần 1 hiệu ứng/component animated có sẵn (particle, transition nền, hover) | **react-bits** | Thư viện 130+ component — copy code trực tiếp, KHÔNG phải skill tự kích hoạt |
| Thêm backend thật: lưu leaderboard, tài khoản, đồng bộ cloud, edge function | **InsForge + insforge-skills** | Backend "agent-native" — Postgres/auth/storage/AI gateway điều khiển qua CLI/MCP, không cần dashboard tay |
| Refactor lớn, feature mới cần kế hoạch, viết PRD, siết TDD, git an toàn | **mattpocock/skills** (`tdd`, `request-refactor-plan`, `write-a-prd`, `git-guardrails-claude-code`) | Kỷ luật kỹ thuật JS/TS — giữ `script.js` (>1800 dòng) không phình loạn thêm |
| Lạc trong codebase, nhiều hệ thống chồng nhau (VR menu / chemistry / physics grid) | **Understand-Anything** | Dựng knowledge-graph toàn project, hỏi thẳng "phần nào xử lý VR menu?" thay vì đọc mù |
| Cần Claude nhớ quyết định kiến trúc / quy ước gesture giữa các session làm việc | **agentmemory** | Memory bền vững qua session — khỏi phải dán lại `copilot-instructions.md` mỗi lần mở chat mới |

## Không dùng
- **ruvnet/ruview** — dự án WiFi-sensing qua ESP32, không liên quan webcam hand-tracking. Bỏ qua hoàn toàn.

## Ghi chú hiệu năng (hand-tracking)
One-Euro filter, physics constraint, physics-grid là hot-path chạy mỗi frame. Không repo nào ở trên
có skill Rust/WASM chuyên biệt cho phần này. Nếu cần tối ưu sâu hơn nữa: viết riêng module tính toán
bằng Rust/AssemblyScript → biên dịch WASM → gọi từ `script.js`. Không đụng vào bản thân MediaPipe
(model đã chạy trên WASM/TFLite sẵn, không tối ưu thêm được từ phía JS).

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **Wchem-VR** (API base `https://wm7m4mk4.ap-southeast.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
