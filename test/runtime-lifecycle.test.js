'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { haven, HavenHandler } = require('../dist/main.js');

function response() {
  const res = new EventEmitter();
  res.headersSent = false;
  res.writableEnded = false;
  res.destroyed = false;
  res.calls = [];
  res.status = function (status) {
    this.calls.push(['status', status]);
    return this;
  };
  res.setHeader = function (key, value) {
    this.calls.push(['header', key, value]);
    return this;
  };
  res.send = function (body) {
    this.calls.push(['send', body]);
    this.writableEnded = true;
    return this;
  };
  return res;
}

function dispatch(res, withDomain) {
  const req = new EventEmitter();
  const middleware = haven(new HavenHandler({
    opts: { handleGlobalErrors: false, auto: true, revealStackTraces: false },
  }));
  let actualDomain;
  middleware(req, res, () => {
    actualDomain = process.domain;
    if (withDomain) withDomain(actualDomain);
  });
  return { req, domain: actualDomain };
}

test('reject invalid pinned uncaughtException callback but accepts a valid one', () => {
  assert.throws(() => new HavenHandler({ onPinnedUncaughtException: true }), /onPinnedUncaughtException/);
  assert.doesNotThrow(() => new HavenHandler({ onPinnedUncaughtException() {} }));
});

test('only one redacted 500 response is emitted for a domain error', () => {
  const res = response();
  const { domain } = dispatch(res);
  assert.ok(domain, 'next() should execute inside a domain');
  domain.emit('error', new Error('sensitive test-only secret'));
  assert.deepEqual(res.calls.filter(x => x[0] === 'status'), [['status', 500]]);
  assert.equal(res.calls.filter(x => x[0] === 'header').length, 1);
  assert.equal(res.calls.filter(x => x[0] === 'send').length, 1);
  const body = res.calls.find(x => x[0] === 'send')[1];
  assert.equal(body.includes('sensitive test-only secret'), false, 'client trace should be redacted');
});

test('does not rewrite responses after headers are sent', () => {
  const res = response();
  res.headersSent = true;
  const { domain } = dispatch(res);
  domain.emit('error', new Error('already committed'));
  assert.equal(res.calls.length, 0);
});

test('does not rewrite completed or disconnected responses', () => {
  for (const property of ['writableEnded', 'destroyed']) {
    const res = response();
    res[property] = true;
    const { domain } = dispatch(res);
    domain.emit('error', new Error('closed'));
    assert.equal(res.calls.length, 0, property);
  }
});

test('close and aborted events release domain ownership exactly once', () => {
  for (const signal of ['close', 'aborted']) {
    const res = response();
    const { req, domain } = dispatch(res);
    assert.equal(domain.alreadyHandled, undefined);
    (signal === 'close' ? res : req).emit(signal);
    assert.equal(domain.alreadyHandled, true, signal);
    assert.equal(domain.listenerCount('error'), 0);
    res.emit('finish');
    res.emit('close');
    req.emit('aborted');
    assert.equal(domain.listenerCount('error'), 0, 'subsequent lifecycle events must not reattach listeners');
  }
});
