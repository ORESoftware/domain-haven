'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SECRET = 'do-not-log-secret-rejection-marker-20261029';
const root = path.resolve(__dirname, '..');

function child(script) {
  return spawnSync(process.execPath, ['--unhandled-rejections=throw', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, NODE_ENV: 'production', DOMAIN_HAVEN_PROD: 'true',
      DOMAIN_HAVEN_PROD_OVERRIDE: 'false', NODE_OPTIONS: '' }
  });
}

function expectFatal(result, label) {
  assert.equal(result.error, undefined, result.error && result.error.message);
  assert.equal(result.signal, null, label + ': unexpected termination signal');
  assert.equal(result.status, 1, label + ': expected explicit exit 1; stderr: ' + result.stderr);
  assert.match(result.stderr, /terminating the process/);
  assert.doesNotMatch(result.stdout + result.stderr, /do-not-log-secret-rejection-marker-20261029/);
  assert.doesNotMatch(result.stdout, /UNSAFE_SURVIVAL/);
}

test('real orphan Promise.reject terminates rather than continuing unsafe process', () => {
  const r = child(`
    require('./dist/main.js').haven();
    Promise.reject(new Error('${SECRET}'));
    setTimeout(() => process.stdout.write('UNSAFE_SURVIVAL'), 150);
  `);
  expectFatal(r, 'actual Promise.reject');
  assert.match(r.stderr, /Unpinned unhandledRejection/);
});

test('a domain with no request ledger rejects an orphan rejection and exits', () => {
  const r = child(`
    require('./dist/main.js').haven();
    const d = require('node:domain').create();
    d.havenId = 987654321;
    d.run(() => {
      process.listeners('unhandledRejection').at(-1)(new Error('${SECRET}'), Promise.resolve());
      process.stdout.write('UNSAFE_SURVIVAL');
    });
  `);
  expectFatal(r, 'orphan domain');
});

test('a handled domain cannot suppress a later rejection', () => {
  const r = child(`
    require('./dist/main.js').haven();
    const d = require('node:domain').create();
    d.havenId = 987654321;
    d.alreadyHandled = true;
    d.run(() => {
      process.listeners('unhandledRejection').at(-1)(new Error('${SECRET}'), Promise.resolve());
      process.stdout.write('UNSAFE_SURVIVAL');
    });
  `);
  expectFatal(r, 'already-handled domain');
  assert.match(r.stderr, /already-handled domain/);
});

test('a rejection pinned to an active request still produces a redacted 500', () => {
  const r = child(`
    const { EventEmitter } = require('node:events');
    const { haven, HavenHandler } = require('./dist/main.js');
    const req = new EventEmitter(), res = new EventEmitter();
    res.headersSent = false; res.writableEnded = false; res.destroyed = false;
    res.status = function(code) { this.statusCode = code; return this; };
    res.setHeader = function() { return this; };
    res.send = function(body) {
      if (this.statusCode === 500 && !body.includes('${SECRET}') &&
        JSON.parse(body).meta['domain-haven'].type === 'unhandledRejection') {
        process.stdout.write('PINNED_REJECTION_OK');
      }
      return this;
    };
    haven(new HavenHandler({opts:{handleGlobalErrors:true,auto:true,revealStackTraces:false}}))(
      req,res,() => process.listeners('unhandledRejection').at(-1)(
        new Error('${SECRET}'), Promise.resolve()
      )
    );
  `);
  assert.equal(r.error, undefined, r.error && r.error.message);
  assert.equal(r.signal, null);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PINNED_REJECTION_OK/);
  assert.doesNotMatch(r.stdout+r.stderr, /do-not-log-secret-rejection-marker-20261029/);
});
