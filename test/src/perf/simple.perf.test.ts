import http = require('http');
import async = require('async');
import request = require('request');
import assert = require('assert');
import util = require('util');

let count = 1;

const tasks = Array.apply(null, Array(55000)).map(function () {
  return function (cb: Function) {
    
    const opts = {
      json: true,
      qs: {haven: null as any}
    };
    
    request.get('http://localhost:6969', opts, function (err, resp, v) {
      
      if (err) {
        return cb(err);
      }

      count++;

      if(count % 1000 === 0){
        console.log('done so far:', count);
      }
      
      cb(null);
    });
    
  }
});

const now = Date.now();

async.parallelLimit(tasks, 105, function (err) {
  if (err) throw err;
  console.log('passed in these millis:', Date.now() - now);
});