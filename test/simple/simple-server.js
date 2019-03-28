'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var express = require("express");
var dist_1 = require("../../dist");
var app = express();
process.once('uncaughtException', function (e) {
    console.error('we have uncaughtException', e);
});
process.once('unhandledRejection', function (e) {
    console.error('we have unhandledRejection: ', e);
});
app.use(function (req, res, next) {
    req.havenData = JSON.parse(req.query.haven);
    if (!Number.isInteger(req.havenData.timeoutAmount)) {
        throw new Error('no timeoutAmount passed');
    }
    next();
});
// haven.emitter.on('error', function (v: HavenError) {
//   if (v.pinned) {
//     const res = v.response;
//     res.json({error: v.error.stack});
//   }
//   else {
//     console.error('error,had to exit.');
//     process.exit(1);
//   }
//
// });
//
//
// haven.emitter.on('rejection', function (v: HavenRejection) {
//   if (v.pinned) {
//     const res = v.response;
//     res.json({error: v.error.stack});
//   }
//   else {
//     console.error('rejection,had to exit.');
//     process.exit(1);
//   }
//
// });
dist_1["default"].emitter.on('blunder', function (v) {
    if (v.pinned) {
        var res = v.response;
        res.json({ error: v.error.stack });
    }
    else {
        console.error('exception,had to exit.');
        process.exit(1);
    }
});
app.use(dist_1["default"]({ auto: false }));
var delay = function (amount) {
    return new Promise(function (res) {
        setTimeout(res, amount);
    });
};
app.use(function (req, res, next) {
    // console.log('havenData:', req.havenData);
    if (req.havenData.throwSync) {
        throw new Error('sync throw A');
    }
    var to = req.havenData.timeoutAmount;
    if (req.havenData.timeoutThrow) {
        return setTimeout(function () {
            throw new Error('timeout throw B');
        }, to);
    }
    if (req.havenData.promiseThrow) {
        return delay(to).then(function () {
            throw new Error('promise throw C');
        });
    }
    if (req.havenData.asyncPromiseThrow) {
        return delay(to).then(function () {
            setTimeout(function () {
                throw new Error('promise throw D');
            }, 100);
        });
    }
    next();
});
app.use(function (req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (req.havenData.asyncAwaitThrow) {
                throw new Error('async await throw E');
            }
            if (req.havenData.asyncAwaitTimeoutThrow) {
                return [2 /*return*/, setTimeout(function () {
                        throw new Error('async await throw F');
                    }, req.havenData.timeoutAmount)];
            }
            next();
            return [2 /*return*/];
        });
    });
});
app.use(function (err, req, res, next) {
    if (!res.headersSent) {
        setTimeout(function () {
            if (!res.headersSent) {
                res.json({ error: 'hit final error middleware', value: err && err.stack || err || null });
            }
        }, 10);
    }
});
app.listen(6969, function () {
    console.log('app is listening.');
});
