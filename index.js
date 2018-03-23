'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const uuid = require("uuid");
const domain = require("domain");
const handleGlobalErrors = function (responseHash, opts) {
    const getErrorTrace = function (e) {
        if (opts && opts.showStackTracesInResponse === false) {
            return e && e.message || util.inspect(e);
        }
        return e && e.stack || util.inspect(e);
    };
    process.on('uncaughtException', function (e) {
        const d = process.domain;
        if (d && d.havenUuid) {
            let res = responseHash[d.havenUuid];
            if (res && !res.headersSent) {
                res.status(500).json({
                    trappedByDomainHavenMiddleware: true,
                    uncaughtException: true,
                    error: getErrorTrace(e)
                });
            }
        }
    });
    process.on('unhandledRejection', function (e, p) {
        if (p && p.domain && p.domain.havenUuid) {
            let res = responseHash[p.domain.havenUuid];
            if (res && !res.headersSent) {
                res.status(500).json({
                    trappedByDomainHavenMiddleware: true,
                    unhandledRejection: true,
                    error: getErrorTrace(e)
                });
            }
        }
    });
};
exports.haven = function (opts) {
    const responseHash = {};
    if (!(opts && opts.handleGlobalErrors === false)) {
        handleGlobalErrors(responseHash);
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
        d.once('error', function (e) {
            if (!res.headersSent) {
                res.status(500).json({
                    error: e && e.stack || util.inspect(e || 'no error trace available')
                });
            }
        });
        d.run(next);
    };
};
exports.default = exports.haven;
