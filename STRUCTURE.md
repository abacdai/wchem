# WChem - Cấu Trúc Dự Án

**Cập nhật:** 2026-07-30 03:34 UTC  
**Dự án:** WChem (VR Chemistry) - Hand tracking chemistry experiments

---

## 📁 Cấu Trúc Thư Mục

```
/home/dominh/Desktop/Wchem/
├── 📄 index.html                    # Trang chủ landing page
├── 📄 lab.html                      # VR Chemistry Lab (ứng dụng chính)
├── 📄 backend-test.html             # Test backend API
├── 📄 start-server.sh               # Script khởi động server
├── 📄 insforge.toml                 # Config backend
├── 📄 skills-lock.json              # Agent skills lock
│
├── 📁 css/                          # Tất cả file CSS
│   ├── design-tokens.css            # CSS variables (màu, font, spacing)
│   ├── hand-bridge.css              # Hand tracking cursor styles
│   ├── lab.css                      # VR Lab main styles
│   ├── landing.css                  # Landing page styles
│   ├── card-nav.css                 # Navigation styles
│   └── handscope-shell.css          # HandScope shell styles
│
├── 📁 js/                           # Tất cả file JavaScript
│   ├── hand-bridge.js               # Hand tracking engine (MediaPipe)
│   ├── lab.js                       # VR Lab logic
│   ├── landing.js                   # Landing page logic
│   ├── card-nav.js                  # Navigation logic
│   ├── handscope-shell.js           # HandScope shell logic
│   ├── gaze.js                      # Eye tracking (experimental)
│   └── click-spark.js               # Click effects
│
├── 📁 assets/                       # Hình ảnh và media
│   └── icon.png                     # App icon
│
├── 📁 docs/                         # Tài liệu và hướng dẫn
│   ├── README.md                    # Giới thiệu dự án
│   ├── AGENTS.md                    # Hướng dẫn agent/skills
│   ├── CLAUDE.md                    # Claude agent instructions
│   ├── DESIGN.md                    # Design system (Kinetic Lab)
│   ├── handtracking-prompt.md       # Hand tracking upgrade plan
│   ├── QUICKSTART.md                # Hướng dẫn khởi động nhanh
│   ├── BACKEND-READY.md             # Backend setup complete
│   ├── BACKEND-STATUS.md            # Backend status (new project)
│   ├── PROGRESS-REPORT.md           # UI update progress
│   ├── UI-UPDATE-COMPLETE.md        # UI update summary
│   └── UI-UX-UPDATE-PLAN.md         # UI update roadmap
│
├── 📁 backend/                      # Backend integration
│   ├── README.md                    # Backend API guide
│   └── insforge-client.js           # InsForge JavaScript client
│
├── 📁 migrations/                   # Database migrations
│   ├── 20260730022949_create-chemistry-schema.sql
│   └── 20260730023030_setup-rls-policies.sql
│
├── 📁 design-system/                # Design system files
│   └── wchem/
│       └── MASTER.md                # Design system master reference
│
├── 📁 source/                       # Source code examples
│   ├── 3DTracker/                   # 3D eye tracker
│   ├── HeadTracker/                 # Head tracking
│   ├── VREyeTracker/                # VR eye tracker
│   └── Webcam3DTracker/             # Webcam 3D tracker
│
├── 📁 .agents/                      # Agent skills và tools
│   └── skills/                      # Installed skills
│
└── 📁 .insforge/                    # InsForge backend config
    └── project.json                 # Project credentials
```

---

## 🚀 Cách Sử Dụng

### Khởi động server
```bash
cd /home/dominh/Desktop/Wchem
./start-server.sh
```

### Truy cập ứng dụng
- **Landing page:** http://localhost:8000/index.html
- **VR Chemistry Lab:** http://localhost:8000/lab.html
- **Backend test:** http://localhost:8000/backend-test.html

---

## 📝 File Quan Trọng

### HTML (Root)
- `index.html` - Trang chủ giới thiệu HandScope
- `lab.html` - VR Chemistry Lab (ứng dụng chính)
- `backend-test.html` - Test InsForge backend API

### CSS (css/)
- `design-tokens.css` - **Quan trọng nhất** - CSS variables cho toàn bộ design system
- `lab.css` - Styles chính cho VR Lab
- `hand-bridge.css` - Hand tracking cursor và overlay

### JavaScript (js/)
- `hand-bridge.js` - **Core** - MediaPipe hand tracking engine
- `lab.js` - VR Lab application logic
- `gaze.js` - Eye tracking (thử nghiệm)

### Docs (docs/)
- `README.md` - Bắt đầu đọc tại đây
- `QUICKSTART.md` - Hướng dẫn nhanh
- `BACKEND-STATUS.md` - Tình trạng backend mới nhất
- `UI-UPDATE-COMPLETE.md` - Tổng kết UI/UX update

---

## 🎨 Design System

### Colors (Discovery Green theme)
- Primary: `#15803D` (Discovery Green - Chemistry/Science)
- Secondary: `#3f56bc` (Science Blue - Info/Accents)
- Accent: `#D97706` (Orange - CTAs)
- Background: `#F0FDF4` (Light green tint)

### Typography
- Headings: **Exo** (futuristic, science-focused)
- Body: **Inter** (readable, clean)
- Technical: **Roboto Mono** (formulas, element symbols)
- UI Labels: **Space Grotesk** (buttons, tabs)

### CSS Variables
Tất cả design tokens ở `css/design-tokens.css`:
- `--color-*` (colors)
- `--font-*` (fonts)
- `--space-*` (spacing)
- `--radius-*` (border radius)
- `--shadow-*` (shadows)

---

## 🔧 Tech Stack

### Frontend
- **HTML5** + **CSS3** (no build step)
- **Vanilla JavaScript** (ES6 modules)
- **MediaPipe Hands** (hand tracking via CDN)
- **Matter.js** (physics engine)
- **Canvas 2D** (rendering)

### Backend
- **InsForge** (Postgres backend as a service)
- **Database:** 8 tables (profiles, compounds, experiments, achievements, leaderboard)
- **Auth:** Email/password + OAuth (Google/GitHub)
- **Storage:** File uploads for experiments

### Design
- **Glassmorphism** aesthetic
- **Discovery Green** color theme
- **WCAG AA** accessibility compliant
- **Mobile responsive** (375px+)

---

## 📦 Dependencies

### External (CDN)
- Google Fonts (Exo, Inter, Roboto Mono, Space Grotesk)
- Material Symbols (icons)
- MediaPipe Hands (hand tracking)

### Backend (npm)
- `@insforge/sdk` (backend client)

---

## 🔐 Security

### Protected Files (gitignored)
- `.env.local` - Backend credentials
- `.insforge/project.json` - Project config
- `backend/*.env` - Environment variables

### Public Safe
- `css/design-tokens.css` - Design variables
- `js/*.js` - Frontend code
- `assets/*` - Public images

---

## 📖 Đọc Thêm

1. **Bắt đầu:** `docs/README.md`
2. **Khởi động nhanh:** `docs/QUICKSTART.md`
3. **Backend setup:** `backend/README.md`
4. **Design system:** `design-system/wchem/MASTER.md`
5. **Hand tracking:** `docs/handtracking-prompt.md`
6. **UI/UX update:** `docs/UI-UPDATE-COMPLETE.md`

---

## 🎯 Quick Commands

```bash
# Khởi động server
./start-server.sh

# Check backend API status
curl -I https://wm7m4mk4.ap-southeast.insforge.app/rest/v1/

# View logs
tail -f .insforge/logs/*.log
```

---

**Tổ chức:** Gọn gàng, dễ tìm, dễ bảo trì  
**Cấu trúc:** Root (HTML) → Folders (css, js, docs, assets, backend)  
**Documentation:** Đầy đủ trong docs/  
**Design System:** Centralized trong css/design-tokens.css
