'use strict';

//dts
import {RequestHandler, Response, Request} from 'express';

//core
import util = require('util');

//npm
// import * as domain from "domain";
// import {Domain} from 'domain';
import {Domain} from "async-hook-domain";
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


const log = {
  info: console.log.bind(console, '[domain-haven package] INFO:'),
  error: console.error.bind(console, '[domain-haven package] ERROR:'),
  warning: console.error.bind(console, '[domain-haven package] WARN:'),
};


const modVars = {
  hasRun: true,
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
const getErrorObject = function (e: any): Error {

  if (e && typeof e.stack === 'string' && typeof e.message === 'string') {
    return e;
  }

  if(e && e instanceof Error){
    return e;
  }

  if (e) {
    return new Error(typeof e === 'string' ? e : util.inspect(e));
  }

  return new Error(`Unknown/falsy error, this is a dummy error. Original value/object was: "${util.inspect(e)}"`);
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
    revealStackTraces: true,
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
      if (typeof v.onUnpinnedUncaughtException !== 'function') {
        throw new Error('the "onUnpinnedUncaughtException" is not a function.');
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

type Falsy = null | undefined | false | 0 | '';
type Truthy<T> = T extends Falsy ? never : T;

const getErrorTrace = function (e: any, opts: HavenOptions & Truthy<any>): InspectedError {

  if (!modVars.overrideProd && !opts.overrideProd) {

    if (modVars.isProd) {
      return {
        originalErrorObj: null,
        errorAsString: modVars.inProdMessage,
        errorObjParsed: {
          message: modVars.inProdMessage
        }
      };
    }

    if (opts && opts.revealStackTraces === false) {
      return {
        originalErrorObj: null,
        errorAsString: modVars.noStackTracesMessage,
        errorObjParsed: {
          message: modVars.noStackTracesMessage
        }
      };
    }
  }

  return {
    originalErrorObj: e,
    errorAsString: typeof e === 'string' ? e : util.inspect(e),
    errorObjParsed: getParsedObject(e, 1)
  }
};

const sendResponse = (res: Response, type: HavenErrorType, errorTrace: InspectedError) => {

  if (res.headersSent) {
    log.warning('Warning: headers already sent for response. Error:', errorTrace);
  }

  try {
    res.status(500);
  } catch (err) {
    log.error(err);
  }

  try {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('content-type', 'application/json'); // just b/c these computers iz gyyyy
  } catch (err) {
    log.error(err);
  }

  try {
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
    log.error(err);
  }

};



export const __havenPerfTestBenchmark = (v?: any): RequestHandler => {
  return (req, res, next) => {
    next();
  }
};


const hasParams = (req: Request) => {
  return (req as any).havenOpts && typeof (req as any).havenOpts === 'object';
};

export const haven = <T extends HavenHandler<T>>(x?: T): RequestHandler => {

  if (!x) {
    x = new HavenHandler() as any;
  }

  const z = x as HavenHandler<T>;  // ughh, for TS compiler, and to create a constant..

  if (!z.opts) {
    z.opts = {
      auto: true,
      revealStackTraces: true,
      handleGlobalErrors: true,
    }
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

    const opts = !hasParams(req) ? z.opts : Object.assign({}, z.opts, (req as any).havenOpts);

    const d = new Domain(e => {

      if(modVars.isProd && opts.auto){
        log.error(getErrorObject(e).stack);
      }

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
          error: errorTrace,
          pinned: true,
          havenType: 'uncaughtException',
          domain: d || null
        }, req, res);
      }
    }) as HavenDomain;


    let cleanedUp = false;

    const cleanUpOnce = () => {
      if (!cleanedUp) {
        cleanedUp = true;
        d.alreadyHandled = true;
        // modVars.havenMap.delete(v);
        d.destroy();
      }
    };

    res.once('finish', () => {
      cleanUpOnce();
    });

    next();

  }

};


export const middleware = haven;
export default haven;

export const r2gSmokeTest = function () {
  return true;
};