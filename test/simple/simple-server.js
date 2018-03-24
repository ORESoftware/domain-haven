'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const domain_haven_1 = require("domain-haven");
const app = express();
process.once('uncaughtException', function (e) {
    console.error('we have uncaughtException', e);
});
process.once('unhandledRejection', function (e) {
    console.error('we have unhandledRejection: ', e);
});
app.use(function (req, res, next) {
    req.havenData = JSON.parse(req.query.haven);
    if (!Number.isInteger(req.havenData.timeoutAmount)) {
        throw new Error('no timeoutAmount passed');
    }
    next();
});
app.use(domain_haven_1.default());
const delay = function (amount) {
    return new Promise(res => {
        setTimeout(res, amount);
    });
};
app.use(function (req, res, next) {
    if (req.havenData.throwSync) {
        throw new Error('sync throw A');
    }
    const to = req.havenData.timeoutAmount;
    if (req.havenData.timeoutThrow) {
        return setTimeout(function () {
            throw new Error('timeout throw B');
        }, to);
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
});
app.use(function (err, req, res, next) {
    if (!res.headersSent) {
        setTimeout(function () {
            if (!res.headersSent) {
                res.json({ error: 'hit final error middleware', value: err && err.stack || err || null });
            }
        }, 10);
    }
});
app.listen(6969, function () {
    console.log('app is listening.');
});
