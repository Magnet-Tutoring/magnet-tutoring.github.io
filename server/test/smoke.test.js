'use strict';

// Smoke test: the Express app serves the existing static site without a DB.
// Starts the app on an ephemeral port and checks a page and an asset.

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { app } = require('../index');

const WEB_ROOT = path.join(__dirname, '..', '..');

function request(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: urlPath }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
  });
}

test('serves the static site', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const home = await request(port, '/');
  assert.strictEqual(home.status, 200, 'GET / should return 200');
  const indexHtml = fs.readFileSync(path.join(WEB_ROOT, 'index.html'), 'utf8');
  assert.strictEqual(home.body, indexHtml, 'GET / should return index.html contents');

  const css = await request(port, '/css/styles.css');
  assert.strictEqual(css.status, 200, 'GET /css/styles.css should return 200');
});
