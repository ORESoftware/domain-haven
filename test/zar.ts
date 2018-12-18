import * as express from 'express';
import {RequestHandler} from 'express';

const router = express.Router();

export const register = (v: any) => {
  router.get('/', makeGetFoo(v));
  router.put('/', makePutFoo(v));
};

namespace ApiDoc {
  
  export interface makeGetFoo  {  // <--- i want to share this interface with front-end codebase
    success: boolean
  }
  
  export interface makePutFoo  {  // <--- i want to share this interface with front-end codebase
    success: boolean
  }
}


export const makeGetFoo = (v: any): RequestHandler => {
  
  return (req, res, next) => {
    
    res.json(<ApiDoc.makeGetFoo>{success: true});
    
  };
  
};

export interface Response2 {  // <--- i want to share this interface with front-end codebase
  success: string
}

export const makePutFoo = (v: any): RequestHandler => {
  
  return (req, res, next) => {
    
    res.json(<ApiDoc[makePutFoo.name]>{success: 'f'});
    
  };
  
};


