'use strict';

import {HavenData} from "../../domain-haven.test";

declare global {
  namespace Express {
    export interface Request {
      havenData: HavenData;
    }
  }
}

import {ErrorRequestHandler} from "express";
import * as express from 'express';
import haven from 'domain-haven';

import {HavenBlunder, HavenTrappedError, HavenException, HavenRejection} from "domain-haven";

const app = express();

process.once('uncaughtException', function (e) {
  console.error('we have uncaughtException', e);
});

process.once('unhandledRejection', function (e: any) {
  console.error('we have unhandledRejection: ', e);
  
});

app.use(function (req: any, res, next) {
  req.havenData = JSON.parse(req.query.haven);
  if (!Number.isInteger(req.havenData.timeoutAmount)) {
    throw new Error('no timeoutAmount passed')
  }
  next();
});

// haven.emitter.on('error', function (v: HavenError) {
//   if (v.pinned) {
//     const res = v.response;
//     res.json({error: v.error.stack});
//   }
//   else {
//     console.error('error,had to exit.');
//     process.exit(1);
//   }
//
// });
//
//
// haven.emitter.on('rejection', function (v: HavenRejection) {
//   if (v.pinned) {
//     const res = v.response;
//     res.json({error: v.error.stack});
//   }
//   else {
//     console.error('rejection,had to exit.');
//     process.exit(1);
//   }
//
// });

haven.emitter.on('blunder', function (v: HavenBlunder) {
  // console.log('blunder:', v);
  if (v.pinned) {
    const res = v.response;
    res.json({error: v.error.stack});
  } else {
    console.error('exception,had to exit.');
    process.exit(1);
  }
  
});

app.use(haven({auto: false}));

const delay = function (amount: number) {
  return new Promise(res => {
    setTimeout(res, amount);
  });
};

app.use(function (req: any, res, next) {
  
  // console.log('havenData:', req.havenData);
  
  if (req.havenData.throwSync) {
    throw new Error('sync throw A');
  }
  
  const to = req.havenData.timeoutAmount;
  
  if (req.havenData.timeoutThrow) {
    return setTimeout(function () {
      throw new Error('timeout throw B');
    }, 100);
  }
  
  if (req.havenData.promiseThrow) {
    return delay(to).then(function () {
      throw new Error('promise throw C');
    });
  }
  
  if (req.havenData.asyncPromiseThrow) {
    return delay(to).then(function () {
      setTimeout(function () {
        throw new Error('promise throw D');
      }, 100);
    });
  }
  
  next();
  
});

app.use(async function (req: any, res, next) {
  
  if (req.havenData.asyncAwaitThrow) {
    throw new Error('async await throw E');
  }
  
  if (req.havenData.asyncAwaitTimeoutThrow) {
    return setTimeout(function () {
      throw new Error('async await throw F');
    }, req.havenData.timeoutAmount);
    
  }
  
  next();
  
});

app.use(<ErrorRequestHandler>function (err, req, res, next) {
  if (!res.headersSent) {
    setTimeout(function () {
      if (!res.headersSent) {
        res.json({error: 'hit final error middleware', value: err && err.stack || err || null})
      }
    }, 10);
  }
  
});

app.listen(6969, '127.0.0.1', function () {
  console.log('app is listening.');
});