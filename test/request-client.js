'use strict';

const http = require('node:http');
const { URL } = require('node:url');
const MAX_RESPONSE_BYTES = 256 * 1024;

function get(target, options, callback) {
  if (typeof callback !== 'function') throw new TypeError('callback is required');
  const opts = options || {};
  let url;
  try {
    url = new URL(target);
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password) {
      throw new Error('Test HTTP client permits unauthenticated loopback HTTP only');
    }
    for (const [key, value] of Object.entries(opts.qs || {})) {
      url.searchParams.set(key, String(value));
    }
  } catch (err) {
    process.nextTick(() => callback(err, null, null));
    return;
  }

  let settled = false;
  const done = (error, response, body) => {
    if (settled) return;
    settled = true;
    callback(error, response, body);
  };
  const req = http.get(url, { timeout: opts.timeoutMs || 18000 }, (response) => {
    const chunks = [];
    let total = 0;
    response.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_RESPONSE_BYTES) {
        req.destroy(new Error('Test response exceeds 256 KiB limit'));
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        done(null, response, opts.json ? JSON.parse(body) : body);
      } catch (err) {
        done(err, response, null);
      }
    });
    response.on('error', (err) => done(err, response, null));
    response.on('close', () => {
      if (!response.complete) done(new Error('Test response terminated early'), response, null);
    });
  });
  req.on('timeout', () => req.destroy(new Error('Test request timed out')));
  req.on('error', (err) => done(err, null, null));
}

module.exports = { get };
