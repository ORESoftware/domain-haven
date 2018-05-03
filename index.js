'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const uuid = require("uuid");
const domain = require("domain");
const EventEmitter = require("events");
const log = {
    info: console.log.bind(console, '[haven stdout]'),
    error: console.log.bind(console, '[haven stderr]'),
};
const getErrorObject = function (e) {
    if (e && typeof e.stack === 'string' && typeof e.message === 'string') {
        return e;
    }
    if (e && !(e instanceof Error)) {
        return new Error(typeof e === 'string' ? e : util.inspect(e));
    }
    return e || new Error('Unknown/falsy error, this is a dummy error.');
};
const handleGlobalErrors = function (responseHash, opts) {
    const auto = !(opts && opts.auto === false);
    const getErrorTrace = function (e) {
        if (opts && opts.showStackTracesInResponse === false) {
            return e && e.message || util.inspect(e);
        }
        return e && e.stack || util.inspect(e);
    };
    process.on('uncaughtException', function (e) {
        const d = process.domain;
        const emitter = exports.haven.emitter;
        if (d && d.havenUuid) {
            let res = responseHash[d.havenUuid];
            if (res && !res.headersSent) {
                if (auto) {
                    return res.status(500).json({
                        trappedByDomainHavenMiddleware: true,
                        uncaughtException: true,
                        error: getErrorTrace(e)
                    });
                }
                return emitter.emit('exception', {
                    message: 'Uncaught exception was pinned to a request/response pair.',
                    error: getErrorObject(e),
                    pinned: true,
                    uncaughtException: true,
                    request: res.req,
                    response: res,
                    domain: d
                });
            }
        }
        emitter.emit('exception', {
            message: 'Uncaught exception could NOT be pinned to a request/response pair.',
            error: getErrorObject(e),
            pinned: false,
            uncaughtException: true,
            request: null,
            response: null,
            domain: d || null
        });
        if (auto) {
            log.error('Uncaught exception could NOT be pinned to a request/response.');
            process.exit(1);
        }
    });
    process.on('unhandledRejection', function (e, p) {
        const emitter = exports.haven.emitter;
        if (p && p.domain && p.domain.havenUuid) {
            let res = responseHash[p.domain.havenUuid];
            if (res && !res.headersSent) {
                if (auto) {
                    return res.status(500).json({
                        trappedByDomainHavenMiddleware: true,
                        unhandledRejection: true,
                        error: getErrorTrace(e)
                    });
                }
                return emitter.emit('rejection', {
                    message: 'Unhandled rejection was pinned to a request/response.',
                    error: getErrorObject(e),
                    unhandledRejection: true,
                    pinned: true,
                    request: res.req,
                    response: res,
                    promise: p,
                    domain: p.domain
                });
            }
        }
        emitter.emit('rejection', {
            message: 'Unhandled rejection could NOT be pinned to a request/response.',
            error: getErrorObject(e),
            pinned: false,
            unhandledRejection: true,
            request: null,
            response: null,
            promise: p || null,
            domain: p && p.domain || null
        });
        if (auto) {
            log.error('Unhandled rejection could NOT be pinned to a request/response.');
            process.exit(1);
        }
    });
};
let registerCount = 0;
exports.haven = function (opts) {
    registerCount++;
    if (registerCount > 1) {
        throw new Error('Haven middleware was registered more than once. Haven middleware should only be use in one place.');
    }
    const responseHash = {};
    const auto = !(opts && opts.auto === false);
    if (!(opts && opts.handleGlobalErrors === false)) {
        handleGlobalErrors(responseHash, opts);
    }
    return function (req, res, next) {
        const d = domain.create();
        const v = d.havenUuid = uuid.v4();
        responseHash[v] = res;
        res.once('finish', function () {
            delete responseHash[d.havenUuid];
            d.exit();
            d.removeAllListeners();
        });
        const emitter = exports.haven.emitter;
        d.once('error', function (e) {
            if (auto) {
                if (!res.headersSent) {
                    res.status(500).json({
                        trappedByDomainHavenMiddleware: true,
                        error: e && e.stack || util.inspect(e || 'no error trace available')
                    });
                }
            }
            else {
                emitter.emit('trapped', {
                    message: 'Uncaught exception was pinned to a request/response pair.',
                    error: getErrorObject(e),
                    pinned: true,
                    uncaughtException: true,
                    request: req,
                    response: res,
                    domain: d || null
                });
            }
        });
        d.run(next);
    };
};
exports.haven.emitter = new EventEmitter();
const onAny = function (v) {
    exports.haven.emitter.emit('blunder', v);
};
exports.haven.emitter.on('rejection', onAny);
exports.haven.emitter.on('exception', onAny);
exports.haven.emitter.on('trapped', onAny);
exports.default = exports.haven;
