import http = require('http');
import async = require('async');
import request = require('request');
import {HavenData} from "./simple-server";
import assert = require('assert');
import util = require('util');

const tasks = Array.apply(null, Array(5000)).map(function () {
  return function (cb: Function) {
    
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
    })
    
    // http.get(opts, function (resp) {
    //
    //   let data = '';
    //
    //   resp.on('data', function (d) {
    //     data += String(d);
    //   });
    //
    //   resp.once('end', function () {
    //
    //     clearTimeout(to);
    //
    //     try {
    //       const v = JSON.parse(data);
    //       assert(String(v.error).match(m), util.inspect(data) + ' does not match: ' + m);
    //     }
    //     catch (err) {
    //       console.error('could not parse:', data);
    //       return cb(err);
    //     }
    //
    //     cb(null);
    //
    //   });
    //
    // });
    
  }
});



async.parallelLimit(tasks, 15, function (err) {
  if (err) throw err;
  console.log('passed.');
});