"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakePut = exports.MakeGet = exports.register = void 0;
const express = require("express");
const router = express.Router();
const register = (v) => {
    router.get('/', MakeGet.makeGetFoo(v));
    router.put('/', MakePut.makePutFoo(v));
};
exports.register = register;
var MakeGet;
(function (MakeGet) {
    MakeGet.makeGetFoo = (v) => {
        return (req, res, next) => {
            res.json({ success: true });
        };
    };
})(MakeGet = exports.MakeGet || (exports.MakeGet = {}));
var MakePut;
(function (MakePut) {
    MakePut.makePutFoo = (v) => {
        return (req, res, next) => {
            res.json({ success: true });
        };
    };
})(MakePut = exports.MakePut || (exports.MakePut = {}));
