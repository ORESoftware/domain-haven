import http = require('http');
import async = require('async');
import request = require('request');
import assert = require('assert');
import util = require('util');
import {HavenData} from "../../domain-haven.test";

let outCount = 0;

const tasks = Array.apply(null, Array(19000)).map(function (n: any, x: number) {
  return function (cb: Function) {
    
    console.log('starting number', x);
    const r = Math.random();
    let m: string;
    
    const qs = {timeoutAmount: Math.ceil(30 * Math.random())} as Partial<HavenData>;
    
    const opts = {
      // hostname: 'localhost',
      // path: '/',
      // url: 'localhost',
      // port: 6969,
      json: true,
      qs: {haven: null as any}
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
    }, 18800);

    opts.qs.haven = JSON.stringify(qs);

    outCount++;
    
    request.get('http://localhost:6969', opts, function (err, resp, v) {

      outCount--;
      
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
      
      console.log('done with number', x, outCount);
      cb(null);
    });
    
    
  }
});

async.parallelLimit(tasks, 35, function (err) {
  if (err) throw err;
  console.log('passed.');
});