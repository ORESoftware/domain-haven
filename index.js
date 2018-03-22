'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
var uuid = require("uuid");
var domain = require("domain");
var handleGlobalErrors = function (responseHash, opts) {
    var getErrorTrace = function (e) {
        if (opts && opts.showStackTracesInResponse === false) {
            return e && e.message || util.inspect(e);
        }
        return e && e.stack || util.inspect(e);
    };
    process.on('uncaughtException', function (e) {
        var d = process.domain;
        if (d && d.havenUuid) {
            var res = responseHash[d.havenUuid];
            if (res && !res.headersSent) {
                res.status(500).json({
                    uncaughtException: true,
                    wasTrappedByDomainHavenMiddleware: true,
                    error: getErrorTrace(e)
                });
            }
        }
    });
    process.on('unhandledRejection', function (e, p) {
        if (p && p.domain && p.domain.havenUuid) {
            var res = responseHash[p.domain.havenUuid];
            if (res && !res.headersSent) {
                res.status(500).json({
                    unhandledRejection: true,
                    wasTrappedByDomainHavenMiddleware: true,
                    error: getErrorTrace(e)
                });
            }
        }
    });
};
exports.haven = function (opts) {
    var responseHash = {};
    if (!(opts && opts.handleGlobalErrors === false)) {
        handleGlobalErrors(responseHash);
    }
    return function (req, res, next) {
        var d = domain.create();
        var v = d.havenUuid = uuid.v4();
        responseHash[v] = res;
        res.once('finish', function () {
            d.exit();
            d.removeAllListeners();
            delete responseHash[d.havenUuid];
        });
        d.once('error', function (e) {
            if (!res.headersSent) {
                res.status(500).json({
                    error: util.inspect(e ? e.stack || e : e)
                });
            }
        });
        d.run(next);
    };
};
exports.default = exports.haven;
