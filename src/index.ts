'use strict';

//dts
import {RequestHandler, Response, Request} from 'express';

//core
import util = require('util');

//npm
import uuid = require('uuid');
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
  havenUuid: string
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

const handleGlobalErrors = (resMap: Map<string, Response>, opts?: Partial<HavenOptions>) => {
  
  const auto = !(opts && opts.auto === false);
  
  const getErrorTrace = function (e: any) {
    if (opts && opts.showStackTracesInResponse === false) {
      return e && e.message || util.inspect(e);
    }
    return e && e.stack || util.inspect(e);
  };
  
  process.on('uncaughtException', e => {
    
    const d = process.domain as HavenDomain;
    const emitter = haven.emitter;
    
    if (d && d.havenUuid) {
      
      let res = resMap.get(d.havenUuid);
      
      if (res) {
        
        if (res.headersSent) {
          log.error('Warning, response headers were already sent for request. Error:', util.inspect(e));
        }
        
        if (!auto || res.headersSent) {
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
          trappedByDomainHavenMiddleware: true,
          uncaughtException: true,
          error: getErrorTrace(e)
        });
        
      }
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
    
    if (p && p.domain && p.domain.havenUuid) {
      
      let res = resMap.get(p.domain.havenUuid);
      
      if (res) {
        
        if (res.headersSent) {
          log.error('Warning, response headers were already sent for request. Error:', util.inspect(e));
        }
        
        if (!auto || res.headersSent) {
          return haven.emitter.emit('rejection', <HavenRejection>{
            message: 'Unhandled rejection was pinned to a request/response.',
            error: getErrorObject(e),
            unhandledRejection: true,
            pinned: true,
            request: (res as any).req,
            response: res,
            promise: p,
            domain: p.domain
          });
        }
        
        return res.status(500).json({
          trappedByDomainHavenMiddleware: true,
          unhandledRejection: true,
          error: getErrorTrace(e)
        });
        
      }
    }
    
    haven.emitter.emit('rejection', <HavenRejection>{
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

let registerCount = 0;

export const haven: Haven = (opts?) => {
  
  if (++registerCount > 1) {
    throw new Error('Haven middleware was registered more than once. Haven middleware should only be use in one place.')
  }
  
  const resMap = new Map<string, Response>();
  const auto = !(opts && opts.auto === false);
  
  if (!(opts && opts.handleGlobalErrors === false)) {
    handleGlobalErrors(resMap, opts);
  }
  
  const getErrorTrace = (e: any) => {
    if (opts && opts.showStackTracesInResponse === false) {
      return e && e.message || util.inspect(e || 'no error trace available');
    }
    return e && e.stack || util.inspect(e || 'no error trace available');
  };
  
  return (req, res, next) => {
    
    const d = domain.create() as HavenDomain; // create a new domain for this request
    const v = d.havenUuid = uuid.v4();
    resMap.set(v, res);
    
    res.once('finish', function () {
      resMap.delete(d.havenUuid);
      d.exit();
      d.removeAllListeners();
    });
    
    d.once('error', function (e) {
      
      if (auto) {
        
        if (res.headersSent) {
          log.error('Warning, headers already sent for response. Error:', util.inspect(e));
          return;
        }
        
        return res.status(500).json({
          trappedByDomainHavenMiddleware: true,
          error: getErrorTrace(e)
        });
        
      }
      
      haven.emitter.emit('trapped', <HavenTrappedError>{
        message: 'Uncaught exception was pinned to a request/response pair.',
        error: getErrorObject(e),
        pinned: true,
        uncaughtException: true,
        request: req,
        response: res,
        domain: d || null
      });
      
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