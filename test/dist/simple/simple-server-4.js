'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express = require("express");
const domain_haven_1 = require("domain-haven");
const app = express();
exports.app = app;
let reqNum = 1;
app.use((req, res, next) => {
    console.log('server 4 request #', reqNum++, 'received');
    next();
});
app.use(function (req, res, next) {
    req.havenData = JSON.parse(req.query.haven);
    if (!Number.isInteger(req.havenData.timeoutAmount)) {
        throw new Error('no timeoutAmount passed');
    }
    next();
});
app.use((0, domain_haven_1.haven)({
    opts: { auto: true },
    async onPinnedError(info, req, res) {
        console.log('info:', info);
        res.json({ error: info.error.errorAsString });
    },
}));
app.use((req, res, next) => {
    console.log('server 4 haven middleware passed.');
    next();
});
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
app.use((req, res, next) => {
    if (req.havenData.asyncAwaitInnerThrow) {
        (async () => {
            await 'whatevver 1';
            await 'whatever 2';
            return Promise.reject('async await throw G inner');
        })();
    }
    else {
        next();
    }
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
app.listen(7074, '127.0.0.1', function () {
    console.log('app is listening.');
    app.emit('haven/listening', '(no data yet)');
});
