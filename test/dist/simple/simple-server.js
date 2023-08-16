'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const domain_haven_1 = require("domain-haven");
const haven2 = require("domain-haven");
console.log(haven2.fooz);
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
domain_haven_1.default.emitter.on('blunder', function (v) {
    if (v.pinned) {
        const res = v.response;
        res.json({ error: v.error.stack });
    }
    else {
        console.error('exception,had to exit.');
        process.exit(1);
    }
});
app.use((0, domain_haven_1.default)({ auto: false }));
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
app.use(async function (req, res, next) {
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
