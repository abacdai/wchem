require('dotenv').config();
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('node:http');
const { initSocket } = require('./socket');
const authRoutes = require('./routes/auth.routes');
const compoundRoutes = require('./routes/compound.routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  // Helmet's default CSP (`script-src 'self'`, `script-src-attr 'none'`) blocks
  // the WChem HTML app: its inline theme/auth scripts, inline event handlers,
  // the GSAP CDN, and the whole MediaPipe camera pipeline (dynamic import +
  // wasm from cdn.jsdelivr.net, models from storage.googleapis.com, opencv.js
  // from docs.opencv.org, WebAssembly instantiation, tracking WebSocket).
  // Relax only what the app needs; keep all other helmet protections
  // (object-src, frame-ancestors, etc.) intact.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': [
            "'self'",
            "'unsafe-inline'",
            "'wasm-unsafe-eval'",
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
            'https://docs.opencv.org',
          ],
          'script-src-attr': ["'unsafe-inline'"],
          'connect-src': [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://storage.googleapis.com',
            'ws:',
            'wss:',
          ],
        },
      },
    })
  );
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/compounds', compoundRoutes);

  // Clean URLs: redirect known .html pages to their extension-less canonical
  // form (301 preserves bookmarks/links), e.g. /lab.html -> /lab.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const m = req.path.match(/^\/(index|lab|profile)\.html$/);
    if (!m) return next();
    const target = m[1] === 'index' ? '/' : '/' + m[1];
    return res.redirect(301, target + req.url.slice(req.path.length));
  });

  // Serve the WChem static app (index.html, lab.html, css/, js/, assets/,
  // backend/) from the project root unless STATIC_DIR is set. `extensions:
  // ['html']` lets /lab and /profile resolve to lab.html / profile.html.
  const staticDir = process.env.STATIC_DIR || path.resolve(__dirname, '..', '..', '..');
  app.use(express.static(staticDir, { dotfiles: 'deny', index: 'index.html', extensions: ['html'] }));

  app.use(notFound);
  app.use(errorHandler);

  const httpServer = createServer(app);
  initSocket(httpServer);
  return httpServer;
}

module.exports = { createApp };
