'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Run against the extracted npm install, never against the source checkout.
const packageRoot = process.argv[2];
assert.ok(packageRoot && path.isAbsolute(packageRoot), 'expected absolute installed package root');

const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
assert.equal(manifest.name, 'domain-haven');
assert.equal(manifest.main, 'dist/main.js');
assert.equal(manifest.types, 'dist/main.d.ts');
assert.ok(fs.statSync(path.join(packageRoot, 'dist/main.js')).size > 0);
assert.ok(fs.statSync(path.join(packageRoot, 'dist/main.d.ts')).size > 0);
assert.equal(fs.existsSync(path.join(packageRoot, 'src')), false, 'published package should not contain source');
assert.equal(fs.existsSync(path.join(packageRoot, 'node_modules/typescript')), false,
  'production consumer must not contain the dev-only compiler');

const resolved = require.resolve(packageRoot);
assert.equal(resolved, path.join(packageRoot, 'dist/main.js'));
const api = require(packageRoot);
assert.equal(typeof api.haven, 'function');
assert.equal(typeof api.HavenHandler, 'function');
assert.equal(typeof api.middleware, 'function');
assert.equal(api.r2gSmokeTest(), true);
console.log('PACKED_CONSUMER_OK', manifest.version, resolved);
