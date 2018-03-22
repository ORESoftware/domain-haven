"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const request = require("request");
const assert = require("assert");
const util = require("util");
const tasks = Array.apply(null, Array(5000)).map(function () {
    return function (cb) {
        const r = Math.random();
        let m;
        const qs = { timeoutAmount: Math.ceil(30 * Math.random()) };
        const opts = {
            json: true,
            qs: { haven: null }
        };
        if (r < 0.33) {
            qs.timeoutThrow = true;
            m = 'timeout throw B';
        }
        else if (r < 0.66) {
            qs.throwSync = true;
            m = 'sync throw A';
        }
        else {
            qs.promiseThrow = true;
            m = 'promise throw C';
        }
        const to = setTimeout(function () {
            cb(new Error('request with the following options timedout: ' + util.inspect(opts)));
        }, 800);
        opts.qs.haven = JSON.stringify(qs);
        request.get('http://localhost:6969', opts, function (err, resp, v) {
            clearTimeout(to);
            if (err) {
                return cb(err);
            }
            try {
                if (v.value) {
                    assert(String(v.value).match(/sync throw A/g), util.inspect(v) + ' does not match: ' + m);
                }
                else {
                    assert(String(v.error).match(m), util.inspect(v) + ' does not match: ' + m);
                }
            }
            catch (err) {
                return cb(err);
            }
            cb(null);
        });
    };
});
async.parallelLimit(tasks, 15, function (err) {
    if (err)
        throw err;
    console.log('passed.');
});
