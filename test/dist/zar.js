'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePutFoo = exports.makeGetFoo = exports.register = void 0;
const express = require("express");
const router = express.Router();
const register = (v) => {
    router.get('/', (0, exports.makeGetFoo)(v));
    router.put('/', (0, exports.makePutFoo)(v));
};
exports.register = register;
const makeGetFoo = (v) => {
    return (req, res, next) => {
        res.json({ success: true });
    };
};
exports.makeGetFoo = makeGetFoo;
const makePutFoo = (v) => {
    return (req, res, next) => {
        res.json({ success: true });
    };
};
exports.makePutFoo = makePutFoo;
