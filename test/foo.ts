import * as express from 'express';
import {RequestHandler} from 'express';

const router = express.Router();

export const register = (v: any) => {
  router.get('/', MakeGet.makeGetFoo(v));
  router.put('/', MakePut.makePutFoo(v));
};

interface ApiDoc {
  success: boolean
}

export namespace MakeGet{
  
  export interface Response extends ApiDoc {  // <--- i want to share this interface with front-end codebase
    success: true
  }
  
  export const makeGetFoo = (v: any): RequestHandler => {
    
    return (req, res, next) => {
      
      res.json(<Response>{success: true});
      
    };
    
  };
  
}


export namespace MakePut {
  
  export interface Response extends ApiDoc {  // <--- i want to share this interface with front-end codebase
    success: true
  }

  export const makePutFoo = (v:any): RequestHandler => {
    
    return (req,res,next) => {
      
      res.json(<Response>{success:true});
      
    };
    
  };
}

