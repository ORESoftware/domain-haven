'use strict';


import {ErrorRequestHandler, NextFunction, Request, Response} from "express";
import * as express from 'express';

let haven = null as any;

if (process.env.use_haven === 'yes') {
  haven = require('domain-haven');
}

import * as ahDomain from 'async-hook-domain';

const app = express();

if (process.env.use_haven === 'yes') {
  console.log('using haven');
  app.use(haven.middleware());
}

if (process.env.use_haven === 'ahd') {
  app.use((req: Request, res: Response, next: NextFunction) => {

    const d = new ahDomain.Domain(err => {
      // console.log('caught an error', err)
      // if you re-throw, it's not going to be caught, and will probably
      // cause the process to crash.
      d.destroy();
      res.json({ahd: true});
    });

    next();
  })
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const r = Math.random();

  if (r < 0.2) {
    return (async () => {
      throw new Error('a')
    })();
  }

  if (r < 0.4) {
    return (async () => {
      return (async () => {
        throw new Error('b')
      })();
    })();
  }

  if (r < 0.6) {
    return (async () => {
      Promise.resolve(null).then(v => {
        Promise.reject('c')
      });
    })();
  }

  if (r < 0.8) {
    return (async () => {
      setTimeout(() => {
        throw new Error('d')
      }, 10);
    })();
  }

  setTimeout(async () => {
    throw new Error('d')
  }, 10);


});

app.use(<ErrorRequestHandler>function (err, req, res, next) {
  err && console.error(err.message || err);
  if (!res.headersSent) {
    setTimeout(function () {
      if (!res.headersSent) {
        res.json({error: 'hit final error middleware', value: err && err.stack || err || null})
      }
    }, 10);
  }

});

app.listen(6969, function () {
  console.log('app is listening.');
});