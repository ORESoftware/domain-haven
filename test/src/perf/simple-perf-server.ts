'use strict';


import {ErrorRequestHandler, NextFunction, Request, Response} from "express";
import * as express from 'express';
import haven from 'domain-haven';

const app = express();

if (process.env.use_haven === 'yes') {
  console.log('using haven');
  app.use(haven());
}

app.use((req: Request, res: Response, next: NextFunction) => {
  (res as any).json({success: true});
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