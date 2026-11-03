'use strict';

// Single Express service: serves the existing static site AND hosts the API +
// admin dashboard. The repo root is the web root so relative asset paths
// resolve exactly as they did on GitHub Pages.

require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const helmet = require('helmet');

const { migrate } = require('./db/migrate');

const WEB_ROOT = path.join(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';

function buildApp() {
  const app = express();

  // Security headers. contentSecurityPolicy is disabled for now because the
  // static pages use inline theme scripts; a tailored CSP can be added later.
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(express.json());

  // Same-origin guard: for state-changing methods under /api and /admin,
  // reject requests whose Origin host does not match the request Host.
  // This (plus sameSite=lax cookies) is the CSRF strategy.
  app.use((req, res, next) => {
    const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const guarded = req.path.startsWith('/api') || req.path.startsWith('/admin');
    if (!stateChanging || !guarded) {
      return next();
    }
    const origin = req.get('origin');
    // Non-browser clients (e.g. curl) may omit Origin; allow those through.
    if (origin) {
      let originHost;
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = null;
      }
      if (originHost !== req.get('host')) {
        return res.status(403).json({ error: 'Cross-origin request rejected.' });
      }
    }
    return next();
  });

  // Routers are mounted here. Later features replace these stubs with the real
  // auth/bookings/admin routers; starting empty lets this feature boot alone.
  const apiRouter = express.Router();
  const adminRouter = express.Router();
  app.use('/api', apiRouter);
  app.use('/admin', adminRouter);

  // Serve the repo root as the web root. extensions: ['html'] lets
  // /book resolve to book.html, while /book.html continues to work.
  app.use(express.static(WEB_ROOT, { extensions: ['html'] }));

  // Production error handler: generic message, no stack traces leaked.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (!isProduction) {
      console.error(err);
    }
    const message = isProduction ? 'Internal server error.' : err.message;
    res.status(err.status || 500).json({ error: message });
  });

  return app;
}

const app = buildApp();

function start() {
  // Best-effort migration: log and continue if the DB is unavailable so the
  // static site still serves.
  migrate().then(
    () => console.log('startup: database schema applied.'),
    (err) => console.warn('startup: migration skipped (DB unavailable):', err.message)
  );

  const port = process.env.PORT || 3000;
  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`Magnet Tutoring server listening on port ${port}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, buildApp, start };
