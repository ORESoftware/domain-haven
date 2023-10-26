'use strict';

//dts
import {RequestHandler, Response, Request} from 'express';

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
  String(process.env.DOMAIN_HAVEN_PROD).toUpperCase()  === 'true' ||
  String(process.env.NODE_ENV).toUpperCase() === 'PRODUCTION' ||
  String(process.env.NODE_ENV).toUpperCase() === 'PROD'
);

const inProdMessage = '(In Production, Cannot Display Error Trace).'
const noStackTracesMessage = '(Domain-Haven Flag Set to No Stack Traces, Cannot Display Error Trace).'

interface InspectedError {
  errorObj: any,
  errorAsString: string
}

const handleGlobalErrors = (resMap: Map<number, Response>, opts?: Partial<HavenOptions>) => {
  
  const auto = !(opts && opts.auto === false);

  const getErrorTrace = function (e: any) : InspectedError {

    if(isProd){
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
    
    const d = process.domain as HavenDomain;
    const emitter = haven.emitter;
    
    if (d && d.havenId) {
      
      let res = resMap.get(d.havenId);
      
      if (res) {
        
        if (res.headersSent) {
          log.error('Warning, response headers were already sent for request. Error:', util.inspect(e));
        }
        
        if (!auto || res.headersSent) {

          if(emitter.listenerCount('exception') < 1){
            console.error('error trapped by domain-haven package:',getErrorObject(e));
            return;
          }

          return emitter.emit('exception', <HavenException>{
            message: 'Uncaught exception was pinned to a request/response pair.',
            error: getErrorObject(e),
            pinned: true,
            uncaughtException: true,
            request: (res as any).req,
            response: res,
            domain: d
          });
        }
        
        return res.status(500).json({

          meta: {
            'domain-haven': {
              trapped: true,
              uncaughtException: true,
            }
          },
          errorInfo: getErrorTrace(e)
        });
        
      }
    }


    if(emitter.listenerCount('exception') < 1){
      console.error('error trapped by domain-haven package:', getErrorObject(e));
    }

    emitter.emit('exception', <HavenException>{
      message: 'Uncaught exception could NOT be pinned to a request/response pair.',
      error: getErrorObject(e),
      pinned: false,
      uncaughtException: true,
      request: null,
      response: null,
      domain: d || null
    });
    
    if (auto) {
      log.error('Uncaught exception could NOT be pinned to a request/response:', util.inspect(e));
      log.error('It is possible that the response has finished writing before the error occurs.');
      // process.exit(1);  // we don't want to exit do we
    }
    
  });
  
  process.on('unhandledRejection', (e, p: HavenPromise) => {

    const emitter = haven.emitter;
    let d: any = null;
    
    if (p && p.domain && p.domain.havenId) {
      d = p.domain;
    } else if (process.domain && (<any>process.domain).havenUuid) {
      d = process.domain;
    }
    
    if (d) {
      
      let res = resMap.get(d.havenUuid);
      
      if (res) {
        
        if (res.headersSent) {
          log.error('Warning, response headers were already sent for request. Error:', util.inspect(e));
        }
        
        if (!auto && emitter.listenerCount('rejection') > 0) {

          if(emitter.listenerCount('rejection') < 1){
            console.error('An error (promise rejection) was trapped by domain-haven package:', getErrorObject(e));
          }

          return emitter.emit('rejection', <HavenRejection>{
            message: 'Unhandled rejection was pinned to a request/response.',
            error: getErrorObject(e),
            unhandledRejection: true,
            pinned: true,
            request: (res as any).req,
            response: res,
            promise: p,
            domain: d
          });
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
        } catch(err){
          log.error(err);
        }

      }
    }

    if(emitter.listenerCount('rejection') < 1){
      log.error('error (promise rejection) untrapped by domain-haven package:', getErrorObject(e));
    }
    
    haven.emitter.emit('rejection', <HavenRejection>{
      message: 'Unhandled rejection could NOT be pinned to a request/response.',
      error: getErrorObject(e),
      pinned: false,
      unhandledRejection: true,
      request: null,
      response: null,
      promise: p || null,
      domain: d || null
    });
    
    if (auto) {
      log.error('Unhandled rejection could NOT be pinned to a request/response:', util.inspect(e));
      log.error('It is possible that the response has finished writing before the error occurs.');
      // process.exit(1);
    }
  });
};

export interface Haven {
  (opts?: Partial<HavenOptions>): RequestHandler;
  
  emitter?: EventEmitter;
}

export const haven: Haven = (opts?) => {

  let havenId = 1;
  const resMap = new Map<number, Response>();
  const auto = !(opts && opts.auto === false);
  
  if (!(opts && opts.handleGlobalErrors === false)) {
    handleGlobalErrors(resMap, opts);
  }
  
  const getErrorTrace = (e: any) : InspectedError => {

    if(isProd){
      return {
        errorObj: null,
        errorAsString: inProdMessage
      };
    }

    if (opts && opts.showStackTracesInResponse === false) {
      return   {
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
    resMap.set(v, res);

    (req as any)._havenDomain = d;
    (res as any)._havenDomain = d;
    
    d._havenRequest = req;
    d._havenResponse = res;
    
    res.once('finish', () => {
      resMap.delete(v);
      d.exit();
      d.removeAllListeners();
    });
    
    d.once('error', e => {
      
      if (auto || haven.emitter.listenerCount('trapped') < 1) {
        
        if (res.headersSent) {
          log.error('Warning, headers already sent for response. Error:', util.inspect(e));
        }

        try{
          res.status(500).json({
            meta: {
              'domain-haven': {
                trapped: true
              }
            },
            errorInfo: getErrorTrace(e)
          });
        } catch(err){
          log.error(err);
        }
      }
      else {

        haven.emitter.emit('trapped', <HavenTrappedError>{
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
    
    // we invoke the next middleware
    d.run(next);
    
  }
  
};

haven.emitter = new EventEmitter();

const onAny = (v: HavenBlunder) => {
  haven.emitter.emit('blunder', v);
};

haven.emitter.on('rejection', onAny);
haven.emitter.on('exception', onAny);
haven.emitter.on('trapped', onAny);

export default haven;

export const r2gSmokeTest = function () {
  return true;
};