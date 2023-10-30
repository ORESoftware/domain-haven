"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const request = require("request");
let count = 1;
const tasks = Array.apply(null, Array(56000)).map(function () {
    return function (cb) {
        const opts = {
            json: true,
            qs: { haven: null }
        };
        request.get('http://localhost:6969', opts, function (err, resp, v) {

            count++;

            if(count % 1000 === 0){
                console.log('done this many so far:', count);
            }

            if (err) {
                return cb(err);  // 15244 // 15391
            }
            cb(null);
        });
    };
});
const now = Date.now();
async.parallelLimit(tasks, 105, function (err) {
    if (err)
        throw err;
    console.log('passed in these millis:', Date.now() - now);
});
