#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server1 = require("./simple-server-1");
const server2 = require("./simple-server-2");
const server3 = require("./simple-server-3");
const server4 = require("./simple-server-4");
server1.app.on('haven/listening', (v) => {
    console.log('server1 is listening:', v);
});
server2.app.on('haven/listening', (v) => {
    console.log('server2 is listening:', v);
});
server3.app.on('haven/listening', (v) => {
    console.log('server3 is listening:', v);
});
server4.app.on('haven/listening', (v) => {
    console.log('server4 is listening:', v);
});
