"use strict";
exports.__esModule = true;
var express = require("express");
var router = express.Router();
exports.register = function (v) {
    router.get('/', exports.makeGetFoo(v));
    router.put('/', exports.makePutFoo(v));
};
exports.makeGetFoo = function (v) {
    return function (req, res, next) {
        res.json({ success: true });
    };
};
exports.makePutFoo = function (v) {
    return function (req, res, next) {
        res.json({ success: true });
    };
};
