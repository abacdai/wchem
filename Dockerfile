# WChem — single-container deploy: Express API + static app
FROM node:22-alpine

WORKDIR /app

# Install backend production dependencies (standalone install, no workspaces)
COPY taskflow/backend/package.json taskflow/backend/package.json
RUN cd taskflow/backend && npm install --omit=dev --no-audit --no-fund

# Backend source
COPY taskflow/backend/src taskflow/backend/src

# Static WChem app (served by Express from /app — matches STATIC_DIR default)
COPY index.html lab.html profile.html ./
COPY css css
COPY js js
COPY assets assets
COPY backend/chemlab-client.js backend/chemlab-client.js

ENV PORT=8000
EXPOSE 8000

CMD ["node", "taskflow/backend/src/server.js"]
