"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
exports.register = (v) => {
    router.get('/', MakeGet.makeGetFoo(v));
    router.put('/', MakePut.makePutFoo(v));
};
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
