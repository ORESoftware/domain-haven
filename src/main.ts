'use strict';

//dts
import {RequestHandler, Response, Request} from 'express';

//core
import util = require('util');

//npm
import * as domain from "domain";
import {Domain} from 'domain';
import * as safe from '@oresoftware/safe-stringify'


export interface HavenOptions {
  auto?: boolean;
  handleGlobalErrors?: boolean;
  revealStackTraces?: boolean;
  overrideProd?: boolean
}

export interface HavenDomain extends Domain {
  havenId: number,
  alreadyHandled: boolean,
}

interface HavenPromise extends Promise<any> {
  domain?: HavenDomain,
}

const log = {
  info: console.log.bind(console, '[domain-haven package] INFO:'),
  error: console.error.bind(console, '[domain-haven package] ERROR:'),
  warning: console.error.bind(console, '[domain-haven package] WARN:'),
};


const modVars = {
  hasRun: false,
  isProd: (
    String(process.env.DOMAIN_HAVEN_PROD).toUpperCase() === 'TRUE' ||
    String(process.env.NODE_ENV).toUpperCase() === 'PRODUCTION' ||
    String(process.env.NODE_ENV).toUpperCase() === 'PROD'
  ),
  overrideProd: process.env.DOMAIN_HAVEN_PROD_OVERRIDE === 'true',
  inProdMessage: '(In Production, Cannot Display Error Trace).',
  noStackTracesMessage: '(Domain-Haven Flag Set to No Stack Traces, Cannot Display Error Trace).',
  havenId: 1,
  havenMap: new Map<number, [HavenHandler<any>, Request, Response, any]>()
};

// @ts-ignore
const _getErrorObject = function (e: any): Error {

  if (e && typeof e.stack === 'string' && typeof e.message === 'string') {
    return e;
  }

  if (e && !(e instanceof Error)) {
    return new Error(typeof e === 'string' ? e : util.inspect(e));
  }

  return e || new Error('Unknown/falsy error, this is a dummy error.');
};


interface InspectedError {
  originalErrorObj: any,
  errorAsString: string,
  errorObjParsed: {
    message?: string,
    stack?: string
  }
}

type HavenErrorType = 'error' | 'unhandledRejection' | 'uncaughtException'

interface HavenInfo {
  message: string,
  pinned: boolean
  domain: Domain
  promise?: Promise<any>
  error: InspectedError
  havenType: HavenErrorType
}

type HookReturnType = any;

interface IHavenHandler {

  opts?: HavenOptions

  onPinnedError?(err: HavenInfo, req: Request, res: Response): HookReturnType;

  onPinnedUnhandledRejection?(err: HavenInfo, req: Request, res: Response): HookReturnType;

  onPinnedUncaughtException?(err: HavenInfo, req: Request, res: Response): HookReturnType;

  onUnpinnedUncaughtException?(err: HavenInfo): HookReturnType;

  onUnpinnedUnhandledRejection?(err: HavenInfo): HookReturnType;
}


export class HavenHandler<T extends IHavenHandler> implements IHavenHandler {

  opts: HavenOptions = {
    auto: true,
    handleGlobalErrors: true,
    revealStackTraces: false,
    overrideProd: false
  }

  constructor(x?: T) {

    const v = (x || {}) as T;

    if (v.opts && typeof v.opts.handleGlobalErrors === 'boolean') {
      this.opts.handleGlobalErrors = v.opts.handleGlobalErrors;
    }

    if (v.opts && typeof v.opts.auto === 'boolean') {
      this.opts.auto = v.opts.auto;
    }

    if (v.opts && typeof v.opts.revealStackTraces === 'boolean') {
      this.opts.revealStackTraces = v.opts.revealStackTraces;
    }

    if (v.onPinnedError) {
      if (typeof v.onPinnedError !== 'function') {
        throw new Error('the "onPinnedError" is not a function.');
      }
      this.onPinnedError = v.onPinnedError
    }

    if (v.onPinnedUncaughtException) {
      if (typeof v.onPinnedUncaughtException !== 'function') {
        throw new Error('the "onPinnedUncaughtException" is not a function.');
      }
      this.onPinnedUncaughtException = v.onPinnedUncaughtException
    }

    if (v.onPinnedUnhandledRejection) {
      if (typeof v.onPinnedUnhandledRejection !== 'function') {
        throw new Error('the "onPinnedUnhandledRejection" is not a function.');
      }
      this.onPinnedUnhandledRejection = v.onPinnedUnhandledRejection
    }

    if (v.onUnpinnedUncaughtException) {
      if (typeof v.onUnpinnedUncaughtException !== 'function') {
        throw new Error('the "onUnpinnedUncaughtException" is not a function.');
      }
      this.onUnpinnedUncaughtException = v.onUnpinnedUncaughtException
    }

    if (v.onUnpinnedUnhandledRejection) {
      if (typeof v.onUnpinnedUnhandledRejection !== 'function') {
        throw new Error('the "onUnpinnedUnhandledRejection" is not a function.');
      }
      this.onUnpinnedUnhandledRejection = v.onUnpinnedUnhandledRejection
    }

  }


  // will be HavenError not any
  onPinnedError?(info: HavenInfo, req: Request, res: Response): HookReturnType;

  onPinnedUnhandledRejection?(info: HavenInfo, req: Request, res: Response): HookReturnType;

  onPinnedUncaughtException?(info: HavenInfo, req: Request, res: Response): HookReturnType;

  onUnpinnedUncaughtException?(info: HavenInfo): HookReturnType;

  onUnpinnedUnhandledRejection?(info: HavenInfo): HookReturnType;

}


const getParsedObject = (e: any, depth: number): any => {

  if (!(e && typeof e === 'object')) {
    return {
      type: typeof e,
      value: e
    }
  }

  if (depth > 4) {
    return e;
  }

  if (Array.isArray(e) && e.length > 5) {
    return e; // TODO copy all props
  }

  if (Array.isArray(e)) {
    const z = [];
    for (const v of e) {
      z.push(getParsedObject(v, depth + 1))
    }
    return z;
  }

  const v = {} as any;

  const descriptors = Object.getOwnPropertyDescriptors(e);

  for (const propertyName in descriptors) {
    if (descriptors.hasOwnProperty(propertyName)) {
      v[propertyName] = e[propertyName];
    }
  }

  return v;

};

const getErrorTrace = function (e: any, opts: HavenOptions = {}): InspectedError {

  opts = opts || {};

  // Debug traces require both a server-wide opt-in and an explicit production
  // environment override. Request-provided options cannot grant disclosure.
  const traceAllowed = opts.revealStackTraces === true &&
    (!modVars.isProd || modVars.overrideProd);

  if (!traceAllowed) {
    const message = modVars.isProd ? modVars.inProdMessage : modVars.noStackTracesMessage;
    return {
      originalErrorObj: null,
      errorAsString: message,
      errorObjParsed: { message }
    };
  }

  return {
    originalErrorObj: e,
    errorAsString: typeof e === 'string' ? e : util.inspect(e),
    errorObjParsed: getParsedObject(e, 1)
  }
};

const sendResponse = (res: Response, type: HavenErrorType, errorTrace: InspectedError) => {

  // A partially committed or disconnected HTTP response must never be rewritten.
  if (res.headersSent || (res as any).writableEnded || (res as any).destroyed) {
    return;
  }

  try {
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.send(
      // safe stringify can handle circular refs, and other issues that JSON.stringify cannot
      safe.stringify({
        meta: {
          'domain-haven': {
            trapped: true,
            type
          }
        },
        error: errorTrace.errorAsString,
        errorInfo: errorTrace
      })
    );

  } catch (err) {
    // Do not log the raw error/trace or attempt to send a second response.
    log.warning('Failed to write the domain error response.');
  }

};


// const PassBackToLibrary = Symbol('passback-control-back-to-domain-haven-lib')


const runOnce = () => {

  if (modVars.hasRun) {
    // we only want to register the global handlers once
    return;
  }

  modVars.hasRun = true;

  process.on('uncaughtException', e => {

    // const errorType = 'uncaughtException';
    const d = process.domain as HavenDomain;

    if (!(d && d.havenId)) {
      // Installing an uncaughtException listener suppresses Node's default
      // fatal behavior. Never continue running after an unowned crash.
      log.error('Unpinned uncaughtException: terminating the process.');
      process.exit(1);
      return;
    }

    if (d.alreadyHandled) {
      log.error('Uncaught exception on an already-handled domain: terminating the process.');
      process.exit(1);
      return;
    }

    d.alreadyHandled = true;
    // so this routine doesn't get called twice
    d.removeAllListeners();
    d.exit();

    const [z, req, res, opts] = (modVars.havenMap.get(d.havenId) || []);
    modVars.havenMap.delete(d.havenId);

    if (!(z && req && res && opts)) {
      // A callback is permitted to observe the failure, not to recover from it.
      // The finally block also covers callbacks that throw synchronously.
      try {
        log.error('Unpinned uncaughtException: terminating the process.');
        if (z && typeof z.onUnpinnedUncaughtException === 'function') {
          z.onUnpinnedUncaughtException({
            message: 'Uncaught exception could NOT be pinned to a request/response pair.',
            error: getErrorTrace(e, opts),
            pinned: false,
            havenType: 'uncaughtException',
            domain: d
          });
        }
      } finally {
        process.exit(1);
      }
      return;
    }

    const auto = !(opts && opts.auto === false);
    const errorTrace = getErrorTrace(e, opts);

    if (!auto && typeof z.onPinnedUncaughtException === 'function') {

      z.onPinnedUncaughtException({
        message: 'Uncaught exception was pinned to a request/response pair.',
        error: errorTrace,
        pinned: true,
        havenType: 'uncaughtException',
        domain: d || null
      }, req, res);

      return;
    }

    // send response
    sendResponse(res, 'uncaughtException', errorTrace);

  });

  process.on('unhandledRejection', (e, p?: HavenPromise) => {

    const getDomainFromSituation = (): HavenDomain | null => {
      if (p && p.domain && p.domain.havenId) {
        return p.domain;
      } else if (process.domain && (<any>process.domain).havenId) {
        return process.domain as HavenDomain;
      } else {
        return null;
      }
    };

    const d = getDomainFromSituation();

    if (!(d && d.havenId)) {
      // Registering an unhandledRejection listener suppresses Node's default
      // fatal behavior in --unhandled-rejections=throw mode.
      log.error('Unpinned unhandledRejection: terminating the process.');
      process.exit(1);
      return;
    }

    if (d.alreadyHandled) {
      log.error('Unhandled rejection on an already-handled domain: terminating the process.');
      process.exit(1);
      return;
    }

    // so this doesn't called twice
    d.alreadyHandled = true;
    d.removeAllListeners();
    d.exit();

    const [z, req, res, opts] = (modVars.havenMap.get(d.havenId) || []);
    modVars.havenMap.delete(d.havenId);

    if (!(z && req && res && opts)) {
      // Observation hooks do not grant permission to recover a crashed
      // request-less process. A throwing hook must not defeat termination.
      try {
        log.error('Unpinned unhandledRejection: terminating the process.');
        if (z && typeof z.onUnpinnedUnhandledRejection === 'function') {
          z.onUnpinnedUnhandledRejection({
            message: 'Unhandled rejection could NOT be pinned to a request/response.',
            error: getErrorTrace(e, opts),
            pinned: false,
            havenType: 'unhandledRejection',
            promise: <any>p || null,
            domain: d || null
          });
        }
      } finally {
        process.exit(1);
      }
      return;
    }

    const auto = !(opts && opts.auto === false);
    const errorTrace = getErrorTrace(e, opts);

    if (!auto && typeof z.onPinnedUnhandledRejection === 'function') {

      z.onPinnedUnhandledRejection({
        message: 'Unhandled rejection was pinned to a request/response.',
        error: errorTrace,
        pinned: true,
        havenType: 'unhandledRejection',
        promise: <any>p || null,
        domain: d || null
      }, req, res);

      return;
    }

    // send response
    sendResponse(res, 'unhandledRejection', errorTrace);

  });

}

export const __havenPerfTestBenchmark = (v?: any): RequestHandler => {
  return (req, res, next) => {
    next();
  }
};


export const haven = <T extends HavenHandler<T>>(x?: T): RequestHandler => {

  if (!x) {
    x = new HavenHandler() as any;
  }

  const z = x as HavenHandler<T>;  // ughh, for TS compiler, and to create a constant..

  if (!z.opts) {
    z.opts = {
      auto: true,
      revealStackTraces: false,
      handleGlobalErrors: true,
    }
  }

  if (!modVars.hasRun && z.opts.handleGlobalErrors) {
    // register the global handlers only once
    runOnce();
  }

  {
    // local vars only in this block

    const opts = z.opts;

    if (opts.auto && modVars.isProd) {
      log.info('domain-haven will handle errors/exceptions/rejections automatically.');
    }

    if (opts.revealStackTraces && !modVars.isProd) {
      log.info('caution: domain-haven will reveal error messages and stack traces to the client.\n' +
        'Use NODE_ENV=prod; or opts.revealStackTraces = false; to switch off.');
    }

    if (!opts.auto) {

      if (typeof z.onPinnedError !== 'function') {
        log.error('warning: auto handling set to false, but "onPinnedError" is not implemented.');
      }

      if (typeof z.onPinnedUnhandledRejection !== 'function') {
        log.error('warning: auto handling set to false, but "onPinnedUnhandledRejection" is not implemented.');
      }

      if (typeof z.onPinnedUncaughtException !== 'function') {
        log.error('warning: auto handling set to false, but "onPinnedUncaughtException" is not implemented.');
      }
    }
  }

  return (req, res, next) => {

    const d = domain.create() as HavenDomain; // create a new domain for this request
    const v = d.havenId = modVars.havenId++;

    const hasParams = () => {
      return (req as any).havenOpts && typeof (req as any).havenOpts === 'object';
    };

    const opts = !hasParams() ? Object.assign({}, z.opts) :
      Object.assign({}, z.opts, (req as any).havenOpts);
    // Request overrides can narrow logging but cannot elevate debug visibility.
    opts.revealStackTraces = z.opts.revealStackTraces === true && opts.revealStackTraces === true;
    opts.overrideProd = false;
    modVars.havenMap.set(v, [z, req, res, opts]);

    let cleanedUp = false;

    const cleanUpOnce = () => {
      if (!cleanedUp) {
        cleanedUp = true;
        d.alreadyHandled = true;
        modVars.havenMap.delete(v);
        d.exit();
        d.removeAllListeners();
      }
    };

    res.once('finish', cleanUpOnce);
    res.once('close', cleanUpOnce);
    req.once('aborted', cleanUpOnce);

    d.once('error', e => {

      // just as a precaution
      cleanUpOnce();

      const errorTrace = getErrorTrace(e, opts);

      if (opts.auto || typeof z.onPinnedError !== 'function') {
        sendResponse(res, 'error', errorTrace);
        return;
      }

      if (typeof z.onPinnedError !== 'function') {
        sendResponse(res, 'error', errorTrace);
      } else {
        z.onPinnedError({
          message: 'Uncaught exception was pinned to a request/response pair.',
          error: getErrorTrace(e, opts),
          pinned: true,
          havenType: 'uncaughtException',
          domain: d || null
        }, req, res);
      }

    });

    // we invoke the next middleware
    d.run(next);

  }

};


export const middleware = haven;
export default haven;

export const r2gSmokeTest = function () {
  return true;
};