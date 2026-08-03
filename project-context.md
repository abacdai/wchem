# project-context.md

# ============================================================================
# PROJECT CONTEXT
# ============================================================================

Project: Wchem
Full Name: Wchem — Hand-Tracked AR Chemistry Lab
Type: Full-Stack Web Application (hand-tracked chemistry experiments)
Runtime: OpenCode
Framework: Loop Engineering
Last Updated: 2026-07-31

# ============================================================================
# WHAT WCHEM IS
# ============================================================================

Wchem is a hand-tracked Augmented Reality chemistry lab controlled by webcam hand tracking.

Users interact with a chemistry simulation using hand gestures.

The project is fully standalone. It does NOT depend on Sandboxels or any
external application. The simulation engine is part of this project.

# ============================================================================
# TECH STACK
# ============================================================================

Frontend

- HTML5 + CSS3 (no build step)
- Vanilla JavaScript (ES6 modules)
- MediaPipe Hands (hand tracking via CDN)
- Matter.js (physics)
- Canvas 2D (rendering)
- Design tokens in css/design-tokens.css (Discovery Green theme)

Backend

- InsForge (Postgres backend as a service)
- 8 tables (profiles, compounds, experiments, achievements, leaderboard)
- Auth: email/password + OAuth (Google/GitHub)
- RLS policies in migrations/

# ============================================================================
# FOLDER STRUCTURE (KEY PATHS)
# ============================================================================

index.html                  Landing page
lab.html                    AR Chemistry Lab (main app)
css/                        All styles (design-tokens.css is the base)
js/                         All application JavaScript
  hand-bridge.js            Core MediaPipe hand tracking engine
  lab.js                    AR Lab application logic
  handscope-shell.js        Shell integration layer
  gaze.js                   Eye tracking (experimental)
assets/                     Images and media
docs/                       Project documentation
backend/                    Backend integration (insforge-client.js)
migrations/                 Database migrations (SQL)
source/                     3D tracker reference implementations

# ============================================================================
# MODULE MAP
# ============================================================================

Hand Tracking  -> js/hand-bridge.js + css/hand-bridge.css (MediaPipe)
Simulation     -> js/lab.js (Matter.js physics + Canvas 2D rendering)
UI             -> js/lab.js, js/card-nav.js, js/handscope-shell.js
Backend        -> backend/insforge-client.js + InsForge API
Design System  -> css/design-tokens.css + design-system/wchem/MASTER.md

# ============================================================================
# MODULE GUARDRAILS
# ============================================================================

Hand Tracking

- Keep MediaPipe pipeline stable.
- Never reduce tracking accuracy or FPS.
- Never change coordinate systems unless necessary.

Simulation Engine

- Keep element and compound identifiers stable.
- Never modify reaction timing.
- Never rewrite the simulation loop.

Rendering

- Preserve the rendering pipeline.
- Avoid unnecessary redraws.

UI

- Maintain responsive layout (375px+).
- Preserve accessibility (WCAG AA).
- Avoid visual regressions.

Backend

- Do not touch .env / .env.local / .insforge/ credentials.
- Database migrations require human approval.

# ============================================================================
# COMMANDS
# ============================================================================

Start server:        ./start-server.sh
Run loop:            ./run-loop.sh
Loop audit:          npx @cobusgreyling/loop-audit .

# ============================================================================
# END OF PROJECT CONTEXT
# ============================================================================
