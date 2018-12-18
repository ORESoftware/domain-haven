"use strict";
exports.__esModule = true;
var express = require("express");
var router = express.Router();
exports.register = function (v) {
    router.get('/', Foo.makeGetFoo(v));
    router.put('/', Foo.makePutFoo(v));
};
var Foo;
(function (Foo) {
    Foo.makeGetFoo = function (v) {
        return function (req, res, next) {
            res.json({ success: true });
        };
    };
    Foo.makePutFoo = function (v) {
        return function (req, res, next) {
            res.json({ success: true });
        };
    };
})(Foo = exports.Foo || (exports.Foo = {}));
