# Wchem — Security Audit Report

**Ngày:** 2026-08-05
**Phạm vi:** Frontend tĩnh (`index.html`, `lab.html`, `profile.html`, `js/*`, `css/*`), backend `taskflow/backend` (Express + MongoDB), cấu hình triển khai (`docker-compose.yml`, `Dockerfile`, `vercel.json`), biến môi trường (`.env.local`, `functions/*.ts`).
**Phương pháp:** Rà soát mã nguồn thủ công + kiểm thử trình duyệt thực tế (Playwright) chống lại máy chủ local `localhost:8000` và `wchem.io.vn`.

---

## 1. Tóm tắt mức độ rủi ro

| Mức độ | Số lượng | Nội dung |
|--------|----------|----------|
| Cao | 3 | JWT secret yếu/hardcode, không có rate limiting auth, CSP nới lỏng `unsafe-inline` |
| Trung bình | 3 | Lưu trữ avatar không kiểm soát (XSS + phình DB), lộ key phát triển `.env.local`, MongoDB không xác thực + mở cổng |
| Thấp | 3 | Account enumeration, thiếu security headers trên static host, fallback secret trong code |

---

## 2. Phát hiện chi tiết

### 2.1 CAO — JWT secret yếu / hardcode

**Vị trí:**
- `docker-compose.yml:16` — `JWT_SECRET=change-me-in-production`
- `taskflow/backend/src/middleware/auth.js` — fallback `'taskflow-dev-secret-change-me'` khi thiếu env

**Rủi ro:** Secret có thể đoán được → kẻ tấn công tự ký token hợp lệ, chiếm quyền bất kỳ tài khoản nào (không cần biết mật khẩu).

**Khuyến nghị:**
- Tạo secret ngẫu nhiên mạnh (≥64 ký tự) và đặt qua biến môi trường trên môi trường production.
- Xóa fallback mặc định trong code; fail-fast nếu thiếu secret.
- Xoay vòng secret ngay khi đổi (toàn bộ token cũ bị vô hiệu — chấp nhận được ở quy mô hiện tại).

### 2.2 CAO — Không có rate limiting trên các route xác thực

**Vị trí:** `taskflow/backend/src/routes/auth.routes.js` (register/login/refresh)

**Rủi ro:** Bruteforce mật khẩu không giới hạn; dễ bị tấn công từ chối dịch vụ qua đăng ký hàng loạt.

**Khuyến nghị:** Thêm middleware giới hạn tốc độ (ví dụ `express-rate-limit`): register ~5 yêu cầu/phút/IP, login ~10/phút/IP.

### 2.3 CAO — CSP cho phép `'unsafe-inline'` cho script

**Vị trí:** `taskflow/backend/src/app.js:26-34`

**Rủi ro:** Nếu có bất kỳ lỗ hổng XSS nào (xem 2.4), `unsafe-inline` + `script-src-attr 'unsafe-inline'` khiến trình duyệt thực thi mã kẻ tấn công ngay lập tức — biến XSS thành chiếm quyền token.

**Khuyến nghị:**
- Ngắn hạn (hiện tại app thực sự dùng inline script + thuộc tính sự kiện): giữ nguyên để không vỡ tính năng, nhưng coi là nợ kỹ thuật ưu tiên.
- Trung hạn: gom inline script ra tệp riêng, thay `onclick=` inline bằng `addEventListener` trong JS, sau đó bỏ `unsafe-inline`, chỉ giữ `'wasm-unsafe-eval'` + các host CDN cần thiết.

### 2.4 TRUNG BÌNH — Avatar chưa được xác thực (stored XSS + phình DB)

**Vị trí cũ:** `js/landing.js` (`updateAuthUI`), `profile.html` (`fillProfile`) — nối chuỗi `user.avatar` trực tiếp vào `innerHTML`/`src`.

**Rủi ro:**
- `User.avatar maxlength: 500000` (`taskflow/backend/src/models/User.js`) — dữ liệu URL khổng lồ làm phình DB, tốn băng thông mỗi lần gọi `me`.
- Avatar là chuỗi tùy ý (không hạn chế nội dung): `src="x" onerror="..."` → stored XSS trên trang của mọi người dùng.

**Đã khắc phục (session này):**
- `js/landing.js` và `profile.html`: thêm `safeAvatar()` — chỉ chấp nhận `data:image/(png|jpe?g|gif|webp);base64,` hoặc `http(s)://`; kèm `safeAttr()` escape mọi thuộc tính HTML hiển thị.
- Khuyến nghị thêm: giới hạn avatar ở phía server (kích thước ~100KB, chỉ nhận data URL ảnh), và ưu tiên upload tệp lên storage thay vì lưu chuỗi trong DB.

### 2.5 TRUNG BÌNH — Key phát triển nằm trong `.env.local` (không bị git theo dõi)

**Vị trí:** `.env.local` (đã bị `.gitignore` loại trừ — không bao giờ commit):
- `OPENROUTER_API_KEY=sk-or-v1-…` — key trả phí, dùng trong `functions/ai-chemistry-assistant.ts`
- `INSFORGE_API_KEY=ik_…`, `VITE_INSFORGE_ANON_KEY=anon_…` — quyền quản trị InsForge project `8441ccca-…`

**Rủi ro:** Nếu máy phát triển bị truy cập hoặc file bị lộ, kẻ tấn công tiêu phí OpenRouter / thao túng dữ liệu InsForge.

**Khuyến nghị:** Không thêm `.env.local` vào git (đã an toàn); xoay vòng `OPENROUTER_API_KEY` và `INSFORGE_API_KEY` định kỳ; trên server production dùng secret manager của nền tảng (Render/InsForge dashboard) thay vì file env trong repo.

### 2.6 TRUNG BÌNH — MongoDB không xác thực, cổng công khai

**Quan sát:** Container `wchem-mongo` (image `mongo:7`, `docker-compose.yml`) chạy không có auth; cổng 27017 được publish ra `0.0.0.0` trên máy chủ.

**Rủi ro:** Bất kỳ máy nào truy cập được IP máy chủ đều đọc/ghi toàn bộ database.

**Khuyến nghị:** Bật xác thực MongoDB (user + password qua env), không publish cổng 27017 ra ngoài (chỉ expose trong mạng docker internal), hoặc dùng MongoDB Atlas/InsForge Storage có quản lý truy cập.

### 2.7 THẤP — Account enumeration

**Quan sát:** `register` trả `409` khi email đã tồn tại; `login` trả `401` khi sai thông tin → kẻ tấn công liệt kê email hợp lệ.

**Khuyến nghị:** Trả lỗi chung chung (ví dụ luôn `401` cho cả hai) hoặc chấp nhận ở mức rủi ro thấp kèm rate limiting (mục 2.2).

### 2.8 THẤP — Thiếu security headers trên static host

**Quan sát:** `wchem.io.vn` phân phối qua Vercel với `vercel.json` rewrite-all → không có helmet; backend phục vụ static (qua `STATIC_DIR`) có helmet nhưng CSP nới lỏng như 2.3.

**Khuyến nghị:** Thêm header `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options` tại tầng proxy/edge; cân nhắc CSP nghiêm ngặt hơn trên trang tĩnh khi đã gom inline script (2.3).

---

## 3. Bug bảo mật liên quan đến UX đã sửa trong session này

### 3.1 Click avatar bị đăng xuất (gốc rễ: token bị xóa khi backend chậm)

**Quan sát (tái hiện bằng Playwright — `/tmp/opencode/repro-down.js`):** Khi `/api/auth/me` lỗi (Render cold start ~50s), `ChemLabClient.init()` gọi `signOut()` — xóa sạch token trong localStorage. Trang sau đó hiển thị trạng thái chưa đăng nhập; click avatar dẫn tới trang cá nhân đã mất phiên → người dùng tưởng "click avatar bị đăng xuất".

**Đã khắc phục:**
- `backend/chemlab-client.js`: `request()` gắn `err.status`; `init()` chỉ `signOut()` khi lỗi `401` (không phải lỗi mạng/5xx) → phiên được giữ khi backend tạm lỗi.

### 3.2 Khóa bản sao chép nội dung + chống thâm nhập console

**Đã làm:** `user-select: none` trên toàn bộ trang frontend (`css/landing.css`, `css/lab.css`; vùng nhập liệu vẫn chọn được); module `js/anti-debug.js` (mới) chặn F12/Ctrl+Shift+I/J/C/Ctrl+U/S, vô hiệu hóa bảng điều khiển, phát hiện DevTools mở, bảo vệ khỏi bị chạy trùng.

---

## 4. Danh sách việc khuyến nghị (ưu tiên)

1. [Cao] Tạo JWT secret mạnh, bỏ fallback trong code, cập nhật `docker-compose.yml` + Render env.
2. [Cao] Thêm rate limiting cho `/api/auth/*`.
3. [Trung bình] Bật auth MongoDB, ẩn cổng 27017 khỏi mạng ngoài.
4. [Trung bình] Xoay vòng `OPENROUTER_API_KEY` / `INSFORGE_API_KEY`; không bao giờ commit `.env.local`.
5. [Trung bình] Giới hạn avatar phía server (kích thước + định dạng).
6. [Thấp] Security headers trên Vercel/edge; theo dõi lộ trình gỡ `unsafe-inline`.
7. [Thấp] Thống nhất mã lỗi register/login chống enumeration.

---

## 5. Ghi chú kỹ thuật

- Máy chủ phát triển local: Express `:8000` phục vụ cả tĩnh lẫn `/api` — cần đặt `CLIENT_ORIGIN` đúng origin production nếu tách domain frontend/backend, nếu không các yêu cầu CORS với `credentials: true` sẽ bị chặn.
- `express.json({ limit: '100kb' })` đã giới hạn payload — tốt; cân nhắc giảm thêm nếu chỉ cần avatar nhỏ.
- `helmet` mặc định đã bật `frame-ancestors`/clickjacking protection — giữ nguyên.
