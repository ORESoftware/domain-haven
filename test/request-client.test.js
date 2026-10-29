'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { get } = require('./request-client');

function request(url, opts) {
  return new Promise((resolve, reject) => {
    get(url, opts, (err, response, body) => err ? reject(err) : resolve({ response, body }));
  });
}

async function withServer(handler, exercise) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    return await exercise(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

test('encodes query parameters and parses JSON', async () => {
  await withServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ haven: url.searchParams.get('haven') }));
  }, async (url) => {
    const { response, body } = await request(url, { json: true, qs: { haven: '{"safe":true}' } });
    assert.equal(response.statusCode, 200);
    assert.equal(body.haven, '{"safe":true}');
  });
});

test('rejects external hosts and credentials without network requests', async () => {
  await assert.rejects(request('http://example.com/', { json: true }), /loopback/);
  await assert.rejects(request('https://127.0.0.1/', { json: true }), /loopback/);
  await assert.rejects(request('http://user:pass@127.0.0.1/', { json: true }), /loopback/);
});

test('rejects malformed JSON', async () => {
  await withServer((req, res) => res.end('{bad'), async url => {
    await assert.rejects(request(url, { json: true }), SyntaxError);
  });
});

test('bounds response buffering', async () => {
  await withServer((req, res) => res.end('x'.repeat(256 * 1024 + 1)), async url => {
    await assert.rejects(request(url, { json: false }), /256 KiB/);
  });
});

test('bounds request duration', async () => {
  await withServer(() => {}, async url => {
    await assert.rejects(request(url, { json: true, timeoutMs: 30 }), /timed out/);
  });
});
