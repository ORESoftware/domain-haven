"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const request = require("request");
const assert = require("assert");
const util = require("util");
const tasks = Array.apply(null, Array(19000)).map(function (n, x) {
    return function (cb) {
        console.log('starting number', x);
        const r = Math.random();
        let m;
        const qs = { timeoutAmount: Math.ceil(30 * Math.random()) };
        const opts = {
            json: true,
            qs: { haven: null }
        };
        if (r < 0.10) {
            qs.timeoutThrow = true;
            m = 'timeout throw B';
        }
        else if (r < 0.20) {
            qs.throwSync = true;
            m = 'sync throw A';
        }
        else if (r < 0.40) {
            qs.asyncPromiseThrow = true;
            m = 'promise throw D';
        }
        else if (r < 0.60) {
            qs.asyncAwaitTimeoutThrow = true;
            m = 'async await throw F';
        }
        else if (r < 0.90) {
            qs.asyncAwaitThrow = true;
            m = 'async await throw E';
        }
        else {
            qs.promiseThrow = true;
            m = 'promise throw C';
        }
        const to = setTimeout(function () {
            cb(new Error('request with the following options timedout: ' + util.inspect(opts)));
        }, 3800);
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
            console.log('done with number', x);
            cb(null);
        });
    };
});
async.parallelLimit(tasks, 15, function (err) {
    if (err)
        throw err;
    console.log('passed.');
});
