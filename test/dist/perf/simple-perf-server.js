'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
let haven = null;
if (process.env.use_haven === 'yes') {
    haven = require('domain-haven');
}
const ahDomain = require("async-hook-domain");
const app = express();
if (process.env.use_haven === 'yes') {
    console.log('using haven');
    app.use(haven.middleware());
}
if (process.env.use_haven === 'ahd') {
    app.use((req, res, next) => {
        const d = new ahDomain.Domain(err => {
            d.destroy();
            res.json({ ahd: true });
        });
        next();
    });
}
app.use((req, res, next) => {
    const r = Math.random();
    if (r < 0.2) {
        return (async () => {
            throw new Error('a');
        })();
    }
    if (r < 0.4) {
        return (async () => {
            return (async () => {
                throw new Error('b');
            })();
        })();
    }
    if (r < 0.6) {
        return (async () => {
            Promise.resolve(null).then(v => {
                Promise.reject('c');
            });
        })();
    }
    if (r < 0.8) {
        return (async () => {
            setTimeout(() => {
                throw new Error('d');
            }, 10);
        })();
    }
    setTimeout(async () => {
        throw new Error('d');
    }, 10);
});
app.use(function (err, req, res, next) {
    err && console.error(err.message || err);
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
