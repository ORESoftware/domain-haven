'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
exports.register = (v) => {
    router.get('/', exports.makeGetFoo(v));
    router.put('/', exports.makePutFoo(v));
};
exports.makeGetFoo = (v) => {
    return (req, res, next) => {
        res.json({ success: true });
    };
};
exports.makePutFoo = (v) => {
    return (req, res, next) => {
        res.json({ success: true });
    };
};
