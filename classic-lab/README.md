# Classic Lab (Cambridge Chemistry Lab Simulator)

Nhúng sẵn (pre-built) từ https://github.com/nsriram/chem_lab — MIT License
(xem LICENSE). Bản build này được dựng với `vite build --base=/classic-lab/`
nên toàn bộ asset nằm trong `/classic-lab/` và được Express (Render) phục vụ
trực tiếp từ repo root; không cần build lại trên máy chủ.

Tính năng: 23 đề thi thật Cambridge AS (9701 Paper 3), bàn thí nghiệm ảo
(pipette, burette, phản ứng, đun, lọc, cân), chấm điểm theo mark scheme, xuất
PDF, đa ngôn ngữ, hoạt động offline (lưu localStorage).

Nâng cấp khi cần: clone repo gốc, sửa, `npm run build -- --base=/classic-lab/`,
copy `dist/*` vào thư mục này.

Lưu ý: CSP của Wchem cho phép `style-src https:` và `font-src https: data:`
nên Google Fonts (Crimson Text, JetBrains Mono, Playfair Display) vẫn chạy.
