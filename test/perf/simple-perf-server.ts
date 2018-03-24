'use strict';

import {HavenData} from "../domain-haven";

declare global {
  namespace Express {
    interface Request {
      havenData: HavenData;
    }
  }
}

import {ErrorRequestHandler} from "express";
import * as express from 'express';
import haven from 'domain-haven';

const app = express();

app.use(function (req, res, next) {
  req.havenData = JSON.parse(req.query.haven || '{}');
  next();
});

if (process.env.use_haven === 'yes') {
  console.log('using haven');
  app.use(haven());
}

app.use(function (req, res, next) {
  res.json({success: true});
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