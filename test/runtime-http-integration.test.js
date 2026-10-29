'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { haven, HavenHandler } = require('../dist/main.js');

const SECRET = 'private-http-uncaught-marker-20261029';

async function serve(exercise, configure) {
  const app = express();
  if (configure) configure(app);
  app.use(haven(new HavenHandler({
    opts: { handleGlobalErrors: false, auto: true, revealStackTraces: false }
  })));
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    await exercise(app, server.address().port);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  }
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path, agent: false }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        body += chunk;
        if (body.length > 16384) {
          req.destroy(new Error('HTTP response exceeded test limit'));
        }
      });
      res.once('error', reject);
      res.once('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.setTimeout(2500, () => req.destroy(new Error('HTTP test timed out')));
    req.once('error', reject);
  });
}

test('real loopback HTTP normal route remains unaffected', async () => {
  await serve(async (app, port) => {
    app.get('/ok', (_req, res) => res.json({ ok: true }));
    const r = await get(port, '/ok');
    assert.equal(r.status, 200);
    assert.deepEqual(JSON.parse(r.body), { ok: true });
  });
});

test('real loopback async route error returns one redacted 500 response', async () => {
  await serve(async (app, port) => {
    app.get('/async-error', () => setImmediate(() => { throw new Error(SECRET); }));
    const r = await get(port, '/async-error');
    assert.equal(r.status, 500);
    assert.match(r.headers['content-type'], /application\/json/);
    assert.equal(JSON.parse(r.body).meta['domain-haven'].trapped, true);
    assert.doesNotMatch(r.body, /private-http-uncaught-marker-20261029/);
  });
});

test('real HTTP request cannot enable stack-trace exposure via options', async () => {
  await serve(async (app, port) => {
    app.get('/untrusted-debug', () => setImmediate(() => { throw new Error(SECRET); }));
    const r = await get(port, '/untrusted-debug');
    assert.equal(r.status, 500);
    assert.doesNotMatch(r.body, /private-http-uncaught-marker-20261029/);
  }, app => {
    app.use((req, _res, next) => {
      req.havenOpts = { revealStackTraces: true, overrideProd: true };
      next();
    });
  });
});

test('real HTTP committed headers are not overwritten after async error', async () => {
  await serve(async (app, port) => {
    app.get('/committed', (_req, res) => {
      res.status(202).write('partial-');
      setImmediate(() => { throw new Error(SECRET); });
      setTimeout(() => res.end('done'), 20);
    });
    const r = await get(port, '/committed');
    assert.equal(r.status, 202);
    assert.equal(r.body, 'partial-done');
    assert.doesNotMatch(r.body, /private-http-uncaught-marker-20261029/);
  });
});
