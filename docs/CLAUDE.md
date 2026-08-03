# HAND//SCOPE — CLAUDE.md

Dự án: WChem - VR Chemistry chạy trên trình duyệt (MediaPipe Hands + Matter.js + Canvas 2D).
File này KHÔNG thay thế `.github/copilot-instructions.md` (kiến trúc/invariant đầy đủ vẫn ở đó) —
nó chỉ định nghĩa **skill/agent nào dùng cho việc gì**, để Claude tự chọn đúng công cụ thay vì
tự bịa cách làm mỗi lần.

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
