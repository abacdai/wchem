# Wchem — Security Audit Report

**Ngày:** 2026-08-05
**Phạm vi:** Frontend tĩnh (`index.html`, `lab.html`, `profile.html`, `js/*`, `css/*`), backend `taskflow/backend` (Express + MongoDB), cấu hình triển khai (`docker-compose.yml`, `Dockerfile`, `vercel.json`), biến môi trường (`.env.local`, `functions/*.ts`).
**Phương pháp:** Rà soát mã nguồn thủ công + kiểm thử trình duyệt thực tế (Playwright) chống lại máy chủ local `localhost:8000` và `wchem.io.vn`.

---

## 1. Tóm tắt mức độ rủi ro

| Mức độ | Số lượng | Nội dung |
|--------|----------|----------|
| Cao | 3 | JWT secret yếu/hardcode ✅ ĐÃ SỬA, không có rate limiting auth ✅ ĐÃ SỬA, CSP nới lỏng `unsafe-inline` ⏳ nợ kỹ thuật |
| Trung bình | 3 | Lưu trữ avatar không kiểm soát (XSS + phình DB) ✅ ĐÃ SỬA, lộ key phát triển `.env.local` ⏳ chờ rotate, MongoDB không xác thực + mở cổng ✅ ĐÃ SỬA (local) |
| Thấp | 3 | Account enumeration ✅ giảm thiểu bằng rate limit, thiếu security headers trên static host ✅ ĐÃ SỬA, fallback secret trong code ✅ ĐÃ SỬA |

---

## 2. Phát hiện chi tiết

> Trạng thái cập nhật 2026-08-05 (T-067): các mục được đánh dấu ✅ đã được
> khắc phục trong đợt này; ⏳ là việc còn lại cần quyết định/action từ phía vận hành.

### 2.1 CAO — JWT secret yếu / hardcode ✅ ĐÃ SỬA

**Vị trí:**
- `docker-compose.yml:16` — `JWT_SECRET=change-me-in-production` (cũ)
- `taskflow/backend/src/middleware/auth.js` — fallback `'taskflow-dev-secret-change-me'` khi thiếu env (cũ)

**Rủi ro:** Secret có thể đoán được → kẻ tấn công tự ký token hợp lệ, chiếm quyền bất kỳ tài khoản nào (không cần biết mật khẩu).

**Đã khắc phục (T-067):**
- `auth.js`: fail-fast khi `NODE_ENV=production` mà thiếu `JWT_SECRET` (server từ chối khởi động kèm thông báo rõ); ngoài production giữ fallback dev kèm warning.
- `docker-compose.yml`: `JWT_SECRET` lấy từ `.env` gốc qua `${JWT_SECRET:?…}` (giá trị tạo bằng `openssl rand -base64 48`), không còn hardcode.
- **LƯU Ý vận hành:** môi trường Render phải đặt `JWT_SECRET` mạnh + `NODE_ENV=production`; sau khi đổi secret, mọi token cũ hết hiệu lực (người dùng đăng nhập lại — chấp nhận được).

### 2.2 CAO — Không có rate limiting trên các route xác thực ✅ ĐÃ SỬA

**Vị trí:** `taskflow/backend/src/routes/auth.routes.js` (register/login/refresh)

**Rủi ro:** Bruteforce mật khẩu không giới hạn; dễ bị tấn công từ chối dịch vụ qua đăng ký hàng loạt.

**Đã khắc phục (T-067):**
- `src/middleware/rateLimit.js` (mới, không phụ thuộc thư viện ngoài): bộ đếm trong bộ nhớ theo IP, key riêng cho từng endpoint, header `X-RateLimit-*` + `Retry-After`, dọn bucket hết hạn định kỳ.
- Áp dụng: register **30/phút/IP**, login **10/phút/IP**, đổi mật khẩu **10/phút/IP** (429).
- `app.js`: `app.set('trust proxy', 1)` để lấy đúng IP khách khi đứng sau Render/Vercel.
- Kiểm chứng: test mới `tests/rateLimit.test.js` (3 test) + thử thực tế 11 lần login → 429.
- ⏳ Lưu ý vận hành: rate limit trong bộ nhớ chỉ có tác dụng trên 1 instance; nếu sau này scale nhiều instance cần nguồn lưu trữ dùng chung (Redis).

### 2.3 CAO — CSP cho phép `'unsafe-inline'` cho script

**Vị trí:** `taskflow/backend/src/app.js:26-34`

**Rủi ro:** Nếu có bất kỳ lỗ hổng XSS nào (xem 2.4), `unsafe-inline` + `script-src-attr 'unsafe-inline'` khiến trình duyệt thực thi mã kẻ tấn công ngay lập tức — biến XSS thành chiếm quyền token.

**Khuyến nghị:**
- Ngắn hạn (hiện tại app thực sự dùng inline script + thuộc tính sự kiện): giữ nguyên để không vỡ tính năng, nhưng coi là nợ kỹ thuật ưu tiên.
- Trung hạn: gom inline script ra tệp riêng, thay `onclick=` inline bằng `addEventListener` trong JS, sau đó bỏ `unsafe-inline`, chỉ giữ `'wasm-unsafe-eval'` + các host CDN cần thiết.

### 2.4 TRUNG BÌNH — Avatar chưa được xác thực (stored XSS + phình DB) ✅ ĐÃ SỬA

**Vị trí cũ:** `js/landing.js` (`updateAuthUI`), `profile.html` (`fillProfile`) — nối chuỗi `user.avatar` trực tiếp vào `innerHTML`/`src`; `User.avatar maxlength: 500000`.

**Rủi ro:**
- `User.avatar maxlength: 500000` — dữ liệu URL khổng lồ làm phình DB, tốn băng thông mỗi lần gọi `me`.
- Avatar là chuỗi tùy ý: `src="x" onerror="..."` → stored XSS trên trang của mọi người dùng.

**Đã khắc phục (T-066 + T-067):**
- Frontend (`js/landing.js`, `profile.html`): `safeAvatar()` — chỉ chấp nhận `data:image/(png|jpe?g|gif|webp);base64,` hoặc `http(s)://`; kèm `safeAttr()` escape mọi thuộc tính HTML hiển thị.
- Backend (T-067): `auth.routes.js` PUT /me từ chối avatar không khớp regex định dạng (data URL ảnh hoặc http(s)) và quá 200KB (400 kèm chi tiết); `User.js maxlength` hạ 500000 → 200000. Kiểm chứng thực tế: avatar `svg` + `onerror=…` bị chặn.

### 2.5 TRUNG BÌNH — Key phát triển nằm trong `.env.local` (không bị git theo dõi)

**Vị trí:** `.env.local` (đã bị `.gitignore` loại trừ — không bao giờ commit):
- `OPENROUTER_API_KEY=sk-or-v1-…` — key trả phí, dùng trong `functions/ai-chemistry-assistant.ts`
- `INSFORGE_API_KEY=ik_…`, `VITE_INSFORGE_ANON_KEY=anon_…` — quyền quản trị InsForge project `8441ccca-…`

**Rủi ro:** Nếu máy phát triển bị truy cập hoặc file bị lộ, kẻ tấn công tiêu phí OpenRouter / thao túng dữ liệu InsForge.

**Khuyến nghị:** Không thêm `.env.local` vào git (đã an toàn); xoay vòng `OPENROUTER_API_KEY` và `INSFORGE_API_KEY` định kỳ; trên server production dùng secret manager của nền tảng (Render/InsForge dashboard) thay vì file env trong repo.

### 2.6 TRUNG BÌNH — MongoDB không xác thực, cổng công khai ✅ ĐÃ SỬA (local)

**Quan sát:** Container `wchem-mongo` (image `mongo:7`, `docker-compose.yml`) chạy không có auth; cổng 27017 được publish ra `0.0.0.0` trên máy chủ.

**Ghi chú quan trọng:** Sau khi rà soát, phát hiện backend production đang dùng **MongoDB Atlas** (`MONGODB_URI=mongodb+srv://…cluster0.bicumi7.mongodb.net/wchem` trong `taskflow/backend/.env` — file KHÔNG bị git theo dõi, an toàn). Container mongo local không phải DB chính của app, nhưng vẫn cần bảo vệ (dữ liệu cũ của giai đoạn triển khai docker).

**Đã khắc phục (T-067):**
- Tạo root user (`wchem_admin`, mật khẩu ngẫu nhiên — chỉ lưu trong môi trường local) trên container đang chạy.
- Dựng lại container với `mongod --auth`, đổi bind từ `0.0.0.0:27017` → `127.0.0.1:27017` (không còn lộ ra mạng LAN), volume dữ liệu giữ nguyên, dữ liệu kiểm chứng còn đủ.
- `docker-compose.yml`: mongo không publish cổng ra máy chủ nữa; auth qua `MONGO_INITDB_ROOT_USERNAME/PASSWORD` từ `.env` gốc (gitignored); app dùng `MONGODB_URI` kèm thông tin xác thực.
- ⏳ LƯU Ý VẬN HÀNH: `MONGO_INITDB_ROOT_*` chỉ tự tạo user trên **volume mới**. Volume `mongo-data` hiện hữu (nếu dùng `docker compose up`) cần migrate 1 lần: khởi động mongo không auth → tạo user → bật `--auth` (đúng quy trình đã làm với container local). Atlas (production) vốn đã có xác thực riêng — không cần đổi gì.

### 2.7 THẤP — Account enumeration ✅ Giảm thiểu bằng rate limit

**Quan sát:** `register` trả `409` khi email đã tồn tại; `login` trả `401` khi sai thông tin → kẻ tấn công liệt kê email hợp lệ.

**Quyết định (T-067):** Giữ nguyên `409` cho register vì UX đăng ký cần thông báo rõ "email đã tồn tại"; nguy cơ enumeration đã được giảm thiểu bằng rate limit (2.2) — spam thử email hàng loạt bị chặn 30/phút/IP.

### 2.8 THẤP — Thiếu security headers trên static host ✅ ĐÃ SỬA

**Quan sát:** `wchem.io.vn` phân phối qua Vercel với `vercel.json` rewrite-all → không có helmet.

**Đã khắc phục (T-067):** `vercel.json` thêm headers cho mọi route: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=()`.

**Còn lại:** CSP nghiêm ngặt hơn trên trang tĩnh khi đã gom inline script ra tệp riêng (xem 2.3).

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

1. [✅ XONG] JWT secret mạnh, bỏ fallback trong code, cập nhật `docker-compose.yml` — **hành động còn lại: đặt `JWT_SECRET` + `NODE_ENV=production` trên Render**.
2. [✅ XONG] Rate limiting cho `/api/auth/*` (register 30, login 10, password 10 /phút/IP).
3. [✅ XONG local] Mongo auth + ẩn cổng 27017 (bind 127.0.0.1) — **volume compose cũ cần migrate 1 lần nếu dùng `docker compose up`**.
4. [⏳ Chờ vận hành] Xoay vòng `OPENROUTER_API_KEY` / `INSFORGE_API_KEY`; không bao giờ commit `.env.local`.
5. [✅ XONG] Giới hạn avatar phía server (200KB + chỉ data URL ảnh/http(s)) + `User.js maxlength`.
6. [⏳ Nợ kỹ thuật] Gỡ `unsafe-inline` khỏi CSP: gom inline script + inline handler ra tệp riêng, rồi siết CSP.
7. [✅ XONG] Security headers trên Vercel (`vercel.json`); giữ nguyên `409` register — enumeration đã được rate limit che chắn.

---

## 5. Ghi chú kỹ thuật

- Máy chủ phát triển local: Express `:8000` phục vụ cả tĩnh lẫn `/api` — cần đặt `CLIENT_ORIGIN` đúng origin production nếu tách domain frontend/backend, nếu không các yêu cầu CORS với `credentials: true` sẽ bị chặn.
- `express.json({ limit: '100kb' })` đã giới hạn payload — tốt; cân nhắc giảm thêm nếu chỉ cần avatar nhỏ.
- `helmet` mặc định đã bật `frame-ancestors`/clickjacking protection — giữ nguyên.
