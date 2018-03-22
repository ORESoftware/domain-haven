'use strict';

//dts
import {RequestHandler, Response} from 'express';

//core
import util = require('util');

//npm
import uuid = require('uuid');
import * as domain from "domain";
import {Domain} from 'domain';

/////////////////////////////////////////////////////////////////////////////////////////////////////

export interface HavenOptions {
  handleGlobalErrors: boolean;
  showStackTracesInResponse: boolean;
}

export interface HavenDomain extends Domain {
  havenUuid: string
}

interface HavenResponseHash {
  [key: string]: Response
}

interface HavenPromise extends Promise<any> {
  domain?: HavenDomain,
}

const handleGlobalErrors = function (responseHash: HavenResponseHash, opts?: HavenOptions) {
  
  const getErrorTrace = function (e: any) {
    if(opts && opts.showStackTracesInResponse === false){
      return e && e.message || util.inspect(e);
    }
    return e && e.stack || util.inspect(e);
  };
  
  process.on('uncaughtException', function (e) {
    const d = process.domain as HavenDomain;
    if (d && d.havenUuid) {
      let res = responseHash[d.havenUuid];
      if (res && !res.headersSent) {
        res.status(500).json({
          uncaughtException: true,
          wasTrappedByDomainHavenMiddleware: true,
          error: getErrorTrace(e)
        });
      }
    }
  });
  
  process.on('unhandledRejection', function (e, p: HavenPromise) {
    if (p && p.domain && p.domain.havenUuid) {
      let res = responseHash[p.domain.havenUuid];
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

export const haven = function (opts?: Partial<HavenOptions>) {
  
  const responseHash = {} as HavenResponseHash;
  
  if (!(opts && opts.handleGlobalErrors === false)) {
    handleGlobalErrors(responseHash);
  }
  
  return <RequestHandler> function (req, res, next) {
    
    let d = domain.create() as HavenDomain; // create a new domain for this request
    const v = d.havenUuid = uuid.v4();
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
    
    // we invoke the next middleware
    d.run(next);
    
  }
  
};

export default haven;