import http = require('http');
import async = require('async');
import request = require('request');
import assert = require('assert');
import util = require('util');

const tasks = Array.apply(null, Array(5000)).map(function () {
  return function (cb: Function) {
    
    const opts = {
      json: true,
      qs: {haven: null as any}
    };
    
    request.get('http://localhost:6969', opts, function (err, resp, v) {
      
      if (err) {
        return cb(err);
      }
      
      cb(null);
    });
    
  }
});

const now = Date.now();

async.parallelLimit(tasks, 15, function (err) {
  if (err) throw err;
  console.log('passed in these millis:', Date.now() - now);
});