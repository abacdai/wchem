# ChemLab — Virtual Chemistry Lab

A full-stack virtual chemistry lab web app built with free, open-source
tools. Search any compound on PubChem, view its 3D structure, and save it
to your personal compound library.

## Stack

- Backend: Node.js + Express + Mongoose + Socket.io (JWT auth)
- Frontend: React 18 + Vite 5 + Tailwind 4 (Wchem theme: Discovery Green,
  Science Blue, glass panels; Exo / Inter / Space Grotesk / Roboto Mono)
- Data: PubChem PUG REST API (free, no API key) — autocomplete, compound
  metadata, 3D SDF structures
- 3D rendering: 3Dmol.js (MIT, loaded from official CDN)

## Getting started

```bash
# 1. Backend (port 4000, needs MongoDB at MONGODB_URI or local mongod)
cd backend
cp .env.example .env   # then edit as needed
npm install
npm run dev

# 2. Frontend (port 5173)
cd frontend
npm install
npm run dev
```

Seed demo data (optional):

```bash
cd backend && npm run seed   # demo@taskflow.dev / demo1234
```

## Features

- **Periodic table** — all 118 elements with category colors; click for a
  detail popover (mass, group, period, block, phase, electron config); View 3D
  loads the element's PubChem structure
- **Molecule explorer** — PubChem search with autocomplete; resolves name →
  CID → formula; renders the 3D structure with 3Dmol.js; Structure / State of
  matter tabs (liquid droplet, solid block, gas cloud)
- **Lab bench** — beaker, test tube, graduated cylinder showing the loaded
  compound's room-temperature phase
- **Reaction lab** — curated reactions (neutralization, acid–carbonate,
  combustion, oxidation, electrolysis) with balanced equations and phase
  labels
- **Compound library** — per-user saved compounds (name, formula, SMILES,
  CID, notes) with realtime sync across open tabs
- **Auth** — register/login with bcrypt + JWT, protected routes

## Testing

```bash
# Backend: Jest + Supertest + MongoMemoryServer (26 tests, coverage-gated)
cd backend && npm test

# Frontend: Vitest + Testing Library (61 tests across 11 files, coverage-gated)
cd frontend && npm test && npm run typecheck && npm run lint
```

## API

| Method | Path               | Description                     |
| ------ | ------------------ | ------------------------------- |
| POST   | /api/auth/register | Create account (returns token)  |
| POST   | /api/auth/login    | Sign in (returns token)         |
| GET    | /api/auth/me       | Current user                    |
| GET    | /api/compounds     | List own compounds (paginated)  |
| POST   | /api/compounds     | Save a compound                 |
| GET    | /api/compounds/:id | Get one compound                |
| PUT    | /api/compounds/:id | Update a compound               |
| DELETE | /api/compounds/:id | Delete a compound               |

Socket events: `compound:created`, `compound:updated`, `compound:deleted`.

## Deployment

### Frontend (Vercel)

`taskflow/vercel.json` rewrites all routes to `index.html` (SPA). Build
settings: root `taskflow/frontend`, build command `npm run build`, output
`dist`. Set `VITE_API_URL` to the deployed backend URL (e.g.
`https://chemlab-api.example.com/api`).

### Backend

Any Node host (Render, Railway, Fly.io, VPS) running
`cd backend && npm install && npm start`. Required env vars:

| Variable       | Example                          |
| -------------- | -------------------------------- |
| `PORT`         | `4000`                           |
| `MONGODB_URI`  | `mongodb+srv://user:pass@host/db` (MongoDB Atlas) |
| `JWT_SECRET`   | a long random string             |
| `CLIENT_ORIGIN`| the deployed frontend URL        |

### WebSockets

Set `CLIENT_ORIGIN` exactly to the frontend origin so Socket.io
(`/socket.io`) accepts the realtime connection across hosts.

## Design system

Tokens live in `frontend/src/index.css` (Wchem Discovery Green `#15803D`,
Science Blue `#3F56BC`, accent `#D97706`, background `#F0FDF4`); glass-panel
cards match `css/design-tokens.css` in the Wchem root.
