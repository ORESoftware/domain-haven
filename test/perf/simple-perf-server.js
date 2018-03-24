'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const domain_haven_1 = require("domain-haven");
const app = express();
app.use(function (req, res, next) {
    req.havenData = JSON.parse(req.query.haven || '{}');
    next();
});
if (process.env.use_haven === 'yes') {
    console.log('using haven');
    app.use(domain_haven_1.default());
}
app.use(function (req, res, next) {
    res.json({ success: true });
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
