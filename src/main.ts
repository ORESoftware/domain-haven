'use strict';

//dts
import {RequestHandler, Response, Request, NextFunction} from 'express';

//core
import util = require('util');

//npm
import * as domain from "domain";
import {Domain} from 'domain';
import EventEmitter = require('events');

/////////////////////////////////////////////////////////////////////////////////////////////////////

export interface HavenOptions {
  auto: boolean;
  handleGlobalErrors: boolean;
  showStackTracesInResponse: boolean;
}

export interface HavenDomain extends Domain {
  havenId: number,
  alreadyHandled: boolean,
  _havenRequest: Request,
  _havenResponse: Response
}

interface HavenPromise extends Promise<any> {
  domain?: HavenDomain,
}

export interface HavenTrappedError {
  message: string,
  domain: Domain | null,
  error: Error,
  request: Request | null
  response: Response | null,
  pinned: true | false,
}

export interface HavenException {
  message: string,
  domain: Domain | null,
  uncaughtException: true,
  error: Error,
  request: Request | null
  response: Response | null,
  pinned: true | false,
}

export interface HavenRejection {
  message: string,
  domain: Domain | null,
  unhandledRejection: true,
  error: Error,
  request: Request | null
  response: Response | null,
  pinned: true | false,
  promise: Promise<any> | null
}


const havenSymbol = Symbol('haven-symbol');

export type HavenBlunder = HavenException | HavenTrappedError | HavenRejection;

const log = {
  info: console.log.bind(console, 'haven stdout:'),
  error: console.error.bind(console, 'haven stderr:'),
};

const getErrorObject = function (e: any) {

  if (e && typeof e.stack === 'string' && typeof e.message === 'string') {
    return e;
  }

  if (e && !(e instanceof Error)) {
    return new Error(typeof e === 'string' ? e : util.inspect(e));
  }

  return e || new Error('Unknown/falsy error, this is a dummy error.');
};

const isProd = (
  String(process.env.DOMAIN_HAVEN_PROD).toUpperCase() === 'true' ||
  String(process.env.NODE_ENV).toUpperCase() === 'PRODUCTION' ||
  String(process.env.NODE_ENV).toUpperCase() === 'PROD'
);

const inProdMessage = '(In Production, Cannot Display Error Trace).'
const noStackTracesMessage = '(Domain-Haven Flag Set to No Stack Traces, Cannot Display Error Trace).'

interface InspectedError {
  errorObj: any,
  errorAsString: string
}


interface HavenError {
  error: any,
  havenType: 'trapped' | 'unhandledRejection' | 'unhandledException'
}


interface IHavenHandler {
  opts: {
    handleGlobalErrors: true;
    autoHandling: true;
  }
  [havenSymbol]: boolean;

  onPinnedError?(err: HavenError, req: Request, res: Response): void;

  onPinnedUnhandledRejection?(err: HavenError, req: Request, res: Response): void;

  onPinnedUnhandledException?(err: HavenError, req: Request, res: Response): void;

  onUnpinnedUnhandledException?(err: HavenError): void;

  onUnpinnedUnhandledRejection?(err: HavenError): void;
}


export class HavenHandler implements IHavenHandler {

  [havenSymbol] = true;

  opts: {
    handleGlobalErrors: true;
    autoHandling: true;
    revealStackTraces: true
  }

  constructor(opts?: any) {

    if (opts && typeof opts.handleGlobalErrors === 'boolean') {
      this.opts.handleGlobalErrors = opts.handleGlobalErrors;
    }

    if (opts && typeof opts.autoHandling === 'boolean') {
      this.opts.autoHandling = opts.autoHandling;
    }

    if (opts && typeof opts.revealStackTraces === 'boolean') {
      this.opts.revealStackTraces = opts.revealStackTraces;
    }

    if (this.opts.autoHandling) {
      log.info('domain-haven will handle errors/exceptions/rejections automatically.');
    }

    if (this.opts.revealStackTraces) {
      log.info('caution: domain-haven will reveal error messages and stack traces to the client.\n' +
        'Use NODE_ENV=prod; or opts.revealStackTraces = false; to switch off.');
    }
  }

  // will be HavenError not any
  onPinnedError?(err: any, req: Request, res: Response): void;

  onPinnedUnhandledRejection?(err: any, req: Request, res: Response): void;

  onPinnedUnhandledException?(err: any, req: Request, res: Response): void;

  onUnpinnedUnhandledException?(err: any): void;

  onUnpinnedUnhandledRejection?(err: any): void;

}

type HavenMap = Map<number, [HavenHandler, Request, Response]>;

const handleGlobalErrors = (resMap: HavenMap, z: HavenHandler, opts?: Partial<HavenOptions>) => {

  const auto = !(opts && opts.auto === false);

  const getErrorTrace = function (e: any): InspectedError {

    if (isProd) {
      return {
        errorObj: null,
        errorAsString: inProdMessage
      };
    }

    if (opts && opts.showStackTracesInResponse === false) {
      return {
        errorObj: null,
        errorAsString: noStackTracesMessage
      };
    }

    return {
      errorObj: e,
      errorAsString: util.inspect(e)
    }
  };


  process.on('uncaughtException', e => {

    const errorType = 'uncaughtException';
    const d = process.domain as HavenDomain;

    log.error('error trapped by domain-haven package:', getErrorObject(e));

    if (!(d && d.havenId)) {
      // this is probably some unrelated uncaughtException
      log.error('domain-haven sees an uncaughtException, but cannot act:', e);
      return;
    }

    if(d.alreadyHandled){
      return;
    }

    d.alreadyHandled = true;
    // so this routine doesn't get called twice
    d.removeAllListeners();
    d.exit();

    const [z, req, res] = (resMap.get(d.havenId) || []);

    if (!res) {
      log.error('domain-haven sees an uncaughtException, but cannot act:', e);

      if (typeof z.onUnpinnedUnhandledException === 'function') {
        z.onUnpinnedUnhandledException({
          message: 'Uncaught exception could NOT be pinned to a request/response pair.',
          error: getErrorObject(e),
          pinned: false,
          uncaughtException: true,
          request: null,
          response: null,
          domain: d || null
        });
      } else {
        log.error('Uncaught exception could NOT be pinned to a request/response:', util.inspect(e));
        log.error('It is possible that the response has finished writing before the error occurs.');
        log.error('To remove these logs, add an "onUnpinnedUnhandledException" handler.');
      }
    }

    if (res.headersSent) {
      log.error('Warning, response headers were already sent for request. Error:', util.inspect(e));
    }

    if (!auto && typeof z.onPinnedUnhandledException === 'function') {

      z.onPinnedUnhandledException({
        message: 'Uncaught exception was pinned to a request/response pair.',
        error: getErrorObject(e),
        pinned: true,
        uncaughtException: true,
        request: req,
        response: res,
        domain: d
      }, req, res);

      return;
    }

    try {
      res.status(500).json({
        meta: {
          'domain-haven': {
            trapped: true,
            uncaughtException: true,
          }
        },
        errorInfo: getErrorTrace(e)
      });
    } catch (err) {
      log.error(err);
    }

  });

  process.on('unhandledRejection', (e, p: HavenPromise) => {

    let d: HavenDomain = null;

    if (p && p.domain && p.domain.havenId) {
      d = p.domain;
    } else if (process.domain && (<any>process.domain).havenId) {
      d = process.domain as HavenDomain;
    }

    if (!(d && d.havenId)) {
      // this is most likely some other unrelated unhandledRejection
      log.error('domain-haven sees an unhandledRejection, but cannot act:', e);
      return;
    }

    if(d.alreadyHandled){
      return;
    }

    // so this doesn't called twice
    d.alreadyHandled = true;
    d.removeAllListeners();
    d.exit();

    const [z,req,res] = resMap.get(d.havenId);

    if (!res) {
      log.error('domain-haven sees an unhandledRejection, but cannot act:', e);

      if (typeof z.onUnpinnedUnhandledException === 'function') {
        z.onUnpinnedUnhandledException({
          message: 'Unhandled rejection could NOT be pinned to a request/response.',
          error: getErrorObject(e),
          pinned: false,
          unhandledRejection: true,
          request: null,
          response: null,
          promise: p || null,
          domain: d || null
        });
      } else {
        log.error('Unhandled rejection could NOT be pinned to a request/response:', util.inspect(e));
        log.error('It is possible that the response has finished writing before the error occurs.');
        log.error('To remove these logs, add an "onUnpinnedUnhandledRejection" handler.');
      }
      return;
    }

    if (res.headersSent) {
      log.error('Warning, response headers were already sent for request. Error:', util.inspect(e));
    }

    if (!auto && typeof z.onPinnedUnhandledRejection === 'function') {

      z.onPinnedUnhandledRejection({
        message: 'Unhandled rejection was pinned to a request/response.',
        error: getErrorObject(e),
        unhandledRejection: true,
        pinned: true,
        request: (res as any).req,
        response: res,
        promise: p,
        domain: d
      }, res.req, res);

      return;
    }

    try {
      res.status(500).json({
        meta: {
          'domain-haven': {
            trapped: true,
            unhandledRejection: true
          }
        },
        error: getErrorTrace(e)
      });
    } catch (err) {
      log.error(err);
    }

  });
};

export interface Haven {
  (z?: HavenHandler): RequestHandler;
}

export const haven: Haven = (z?: HavenHandler) => {

  let havenId = 1;
  const resMap = new Map<number, [HavenHandler, Request, Response]>;

  if (z && z[havenSymbol] !== true) {
    throw new Error('Please pass a HavenHandler type to the haven middleware function.');
  }

  if (!z) {
    z = new HavenHandler();
  }

  const opts = z.opts as any;
  const auto = opts.autoHandling === true;

  if (opts.handleGlobalErrors === true) {
    handleGlobalErrors(resMap, z, opts);
  }

  const getErrorTrace = (e: any): InspectedError => {

    if (isProd) {
      return {
        errorObj: null,
        errorAsString: inProdMessage
      };
    }

    if (opts && opts.showStackTracesInResponse === false) {
      return {
        errorObj: null,
        errorAsString: noStackTracesMessage
      };
    }

    return {
      errorObj: e,
      errorAsString: util.inspect(e)
    };
  };

  return (req, res, next) => {

    const d = domain.create() as HavenDomain; // create a new domain for this request
    const v = d.havenId = havenId++;
    resMap.set(v, [z,req,res]);

    (req as any)._havenDomain = d;
    (res as any)._havenDomain = d;

    d._havenRequest = req;
    d._havenResponse = res;

    res.once('finish', () => {
      resMap.delete(v);
      d.exit();
      d.removeAllListeners();
    });

    const send = (e: any) => {
      try {
        res.status(500).json({
          meta: {
            'domain-haven': {
              trapped: true
            }
          },
          errorInfo: getErrorTrace(e)
        });
      } catch (err) {
        log.error(err);
      }
    }

    d.once('error', e => {

      // just as a precaution
      resMap.delete(v);

      if (auto || typeof z.onPinnedError !== 'function') {

        if (res.headersSent) {
          log.error('Warning: headers already sent for response. Error:', util.inspect(e));
        }

        send(e);
        return;


      } else {

        if (typeof z.onPinnedError !== 'function') {

          send(e);

        } else {

          z.onPinnedError(<HavenTrappedError>{
            message: 'Uncaught exception was pinned to a request/response pair.',
            error: getErrorObject(e),
            pinned: true,
            uncaughtException: true,
            request: req,
            response: res,
            domain: d || null
          }, req, res);
        }
      }
    });

    // we invoke the next middleware
    d.run(next);

  }

};


export default haven;

export const r2gSmokeTest = function () {
  return true;
};