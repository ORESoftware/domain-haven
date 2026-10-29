'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const secret = 'sensitive-unpinned-uncaught-marker-20261029';

function child(code) {
  return spawnSync(process.execPath, ['-e', code], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DOMAIN_HAVEN_PROD: 'false',
      DOMAIN_HAVEN_PROD_OVERRIDE: 'false',
    }
  });
}

function assertFatal(result, expected) {
  assert.equal(result.error, undefined, result.error && result.error.message);
  assert.equal(result.signal, null, 'child must terminate itself, not hang or be killed');
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, expected);
  assert.doesNotMatch(result.stdout, /UNSAFE_SURVIVAL/);
  assert.doesNotMatch(result.stderr, /sensitive-unpinned-uncaught-marker-20261029/,
    'uncaught exception reason must not be printed by the fallback handler');
}

test('real asynchronous unpinned uncaught exception terminates with status 1', () => {
  const result = child(`
    require('./dist/main.js').haven();
    setImmediate(() => { throw new Error('${secret}'); });
    setTimeout(() => process.stdout.write('UNSAFE_SURVIVAL'), 100);
  `);
  assertFatal(result, /Unpinned uncaughtException: terminating the process/);
});

test('an uncaught exception in a domain without an active request terminates', () => {
  const result = child(`
    require('./dist/main.js').haven();
    const d = require('node:domain').create();
    d.havenId = 987654321;
    d.run(() => {
      // Node installs a domain-clearing listener before the library listener.
      // Invoke the library's final registered listener to exercise the orphan-domain branch;
      // the separate async-throw case above validates genuine Node event dispatch.
      process.listeners('uncaughtException').at(-1)(new Error('${secret}'));
      process.stdout.write('UNSAFE_SURVIVAL');
    });
  `);
  assertFatal(result, /Unpinned uncaughtException: terminating the process/);
});

test('an already-handled domain cannot suppress a second uncaught exception', () => {
  const result = child(`
    require('./dist/main.js').haven();
    const d = require('node:domain').create();
    d.havenId = 987654321;
    d.alreadyHandled = true;
    d.run(() => {
      // Native process.emit clears process.domain before invoking callbacks.
      // Invoke the real registered listener directly to exercise the orphan-domain branch;
      // the separate async-throw case above validates genuine Node event dispatch.
      process.listeners('uncaughtException').at(-1)(new Error('${secret}'));
      process.stdout.write('UNSAFE_SURVIVAL');
    });
  `);
  assertFatal(result, /already-handled domain: terminating the process/);
});

test('ordinary pinned domain errors still produce a response without process termination', () => {
  const result = child(`
    const { EventEmitter } = require('node:events');
    const { haven, HavenHandler } = require('./dist/main.js');
    const req = new EventEmitter();
    const res = new EventEmitter();
    res.headersSent = false;
    res.writableEnded = false;
    res.destroyed = false;
    res.status = function (status) { this.statusCode = status; return this; };
    res.setHeader = function () { return this; };
    res.send = function (body) {
      if (this.statusCode === 500 && !body.includes('${secret}')) {
        process.stdout.write('PINNED_500_OK');
      }
      return this;
    };
    haven(new HavenHandler({opts:{handleGlobalErrors:true,auto:true,revealStackTraces:false}}))(
      req, res, () => process.domain.emit('error', new Error('${secret}'))
    );
  `);
  assert.equal(result.error, undefined, result.error && result.error.message);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PINNED_500_OK/);
  assert.doesNotMatch(result.stdout + result.stderr, /UNSAFE_SURVIVAL/);
});
