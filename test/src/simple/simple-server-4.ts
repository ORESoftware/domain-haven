'use strict';

import {HavenData} from "../../domain-haven.test";

import {ErrorRequestHandler} from "express";
import * as express from 'express';
import {haven, HavenHandler} from 'domain-haven';

const app = express();

// process.on('uncaughtException', function (e) {
//   console.error('we have uncaughtException', e);
// });
//
// process.on('unhandledRejection', function (e: any) {
//   console.error('we have unhandledRejection: ', e);
// });

let reqNum = 1;
app.use((req,res,next) => {
  console.log('server 4 request #', reqNum++, 'received');
  next();
});

app.use(function (req: any, res, next) {
  req.havenData = JSON.parse(req.query.haven);
  if (!Number.isInteger(req.havenData.timeoutAmount)) {
    throw new Error('no timeoutAmount passed')
  }
  next();
});


app.use(haven({
  opts: {auto: true},
  async onPinnedError(info, req, res) {
    console.log('info:', info);
    res.json({error: info.error.errorAsString});
  },
}));


app.use((req,res,next) => {
  console.log('server 4 haven middleware passed.');
  next();
});


//
// app.use(haven({
//
//   opts:{
//     auto: false
//   },
//
//   onPinnedError(info, req, res){
//     // console.log('info:', info);
//     res.json({error: info.error.errorAsString});
//   },
//
//   onPinnedUncaughtException(info, req, res){
//     // console.log('info uncahgth exc:', info);
//     res.json({error: info.error.errorAsString});
//   },
//
//   onPinnedUnhandledRejection(info, req, res){
//     // console.log('info unhandled rej:', info);
//     res.json({error: info.error.errorAsString});
//   },
//
//   onUnpinnedUncaughtException(info){
//     console.error('uncaught exception, had to exit:',info);
//     process.exit(1);
//   },
//
//   onUnpinnedUnhandledRejection(info){
//     console.error('unhandled rejection, had to exit:', info);
//     process.exit(1);
//   }
//
// }));

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

app.use((req, res, next) => {

  if (req.havenData.asyncAwaitInnerThrow) {
    (async () => {
      await 'whatevver 1';
      await 'whatever 2';
      return Promise.reject('async await throw G inner');
    })();
  } else {
    next();
  }

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


app.listen(7074, '127.0.0.1', function () {
  console.log('app is listening.');
  app.emit('haven/listening', '(no data yet)');
});

export {app};