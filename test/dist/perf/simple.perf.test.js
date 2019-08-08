"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const request = require("request");
const tasks = Array.apply(null, Array(5000)).map(function () {
    return function (cb) {
        const opts = {
            json: true,
            qs: { haven: null }
        };
        request.get('http://localhost:6969', opts, function (err, resp, v) {
            if (err) {
                return cb(err);
            }
            cb(null);
        });
    };
});
const now = Date.now();
async.parallelLimit(tasks, 15, function (err) {
    if (err)
        throw err;
    console.log('passed in these millis:', Date.now() - now);
});
