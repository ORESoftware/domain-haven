'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { EventEmitter } = require('node:events');
const { haven, HavenHandler } = require('../dist/main.js');

const SECRET = 'private-runtime-trace-marker-do-not-disclose';

function runLocal(serverOpts, requestOpts) {
  const req = new EventEmitter();
  req.havenOpts = requestOpts;
  const res = new EventEmitter();
  res.headersSent = false;
  res.writableEnded = false;
  res.destroyed = false;
  res.status = function (code) { this.code = code; return this; };
  res.setHeader = function () { return this; };
  res.send = function (body) { this.body = body; this.writableEnded = true; return this; };
  const middleware = haven(new HavenHandler({
    opts: { handleGlobalErrors: false, auto: true, ...serverOpts },
  }));
  middleware(req, res, () => process.domain.emit('error', new Error(SECRET)));
  assert.equal(res.code, 500);
  assert.equal(typeof res.body, 'string');
  return res.body;
}

function runProduction(serverOpts, requestOpts, explicitEnvOverride) {
  const source = [
    "const {EventEmitter} = require('node:events');",
    "const {haven,HavenHandler} = require('./dist/main.js');",
    "const req = new EventEmitter();",
    "req.havenOpts = " + JSON.stringify(requestOpts) + ";",
    "const res = new EventEmitter();",
    "res.headersSent = false; res.writableEnded = false; res.destroyed = false;",
    "res.status = function(){return this}; res.setHeader = function(){return this};",
    "res.send = function(body){process.stdout.write('DOMAIN_BODY:' + body + '\\n'); return this};",
    "haven(new HavenHandler({opts:{handleGlobalErrors:false,auto:true,..."+JSON.stringify(serverOpts)+"}}))(req,res,()=>process.domain.emit('error',new Error('"+SECRET+"')));",
  ].join('\n');
  return spawnSync(process.execPath, ['-e', source], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, NODE_ENV: 'production', DOMAIN_HAVEN_PROD: 'true',
      DOMAIN_HAVEN_PROD_OVERRIDE: explicitEnvOverride ? 'true' : 'false' },
  });
}

test('default local error response is redacted, including originalErrorObj', () => {
  const body = runLocal({}, undefined);
  assert.doesNotMatch(body, /private-runtime-trace-marker-do-not-disclose/);
  assert.match(body, /originalErrorObj/);
  assert.match(body, /null/);
});

test('untrusted request options cannot elevate the server default', () => {
  const body = runLocal({}, { revealStackTraces: true, overrideProd: true });
  assert.doesNotMatch(body, /private-runtime-trace-marker-do-not-disclose/);
});

test('explicit developer server opt-in permits nonproduction traces', () => {
  const body = runLocal({ revealStackTraces: true }, undefined);
  assert.match(body, /private-runtime-trace-marker-do-not-disclose/);
});

test('a request cannot override production redaction even when server opted in', () => {
  const child = runProduction({ revealStackTraces: true }, { revealStackTraces: true, overrideProd: true }, false);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /DOMAIN_BODY:/);
  assert.doesNotMatch(child.stdout, /private-runtime-trace-marker-do-not-disclose/);
  assert.match(child.stdout, /In Production, Cannot Display Error Trace/);
});

test('production env override requires independent server debug opt-in', () => {
  const child = runProduction({}, { revealStackTraces: true, overrideProd: true }, true);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /DOMAIN_BODY:/);
  assert.doesNotMatch(child.stdout, /private-runtime-trace-marker-do-not-disclose/);
});

test('only a server env override plus server debug opt-in permits a production trace', () => {
  const child = runProduction({ revealStackTraces: true }, {}, true);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /DOMAIN_BODY:/);
  assert.match(child.stdout, /private-runtime-trace-marker-do-not-disclose/);
});
