

# Domain-Haven

This is an awesome module for using Node.js domains to capture runtime errors and <br>
pin errors / exceptions / unhandled-rejections to a particular request/response.

```js

import * as express from 'express';
import haven from 'domain-haven';

const app = express();
app.use(haven());

export {app};

```

# Behavior

By default, if an `uncaughtException` or `unhandledRejection` occurs and a request/response pair can be 
<br>
pinned to the event, a JSON error response will be sent.  If the event cannot be pinned to
<br>
to a particular request/response, Haven will shutdown the process.

_______________________________________________

On the other hand, if the developer wants full control of what response to send, etc, use:

```js
app.use(haven({auto:false}));
```

and then use this event handler:

```js

haven.emitter.on('blunder', function (v: HavenBlunder) {  
  
  if(v.pinned){
     const req = v.request, res = v.response;
     // you now know what request/response caused the error, do what you want with that info
     res.json({error: v.error.message});
   }
   else{
      // the error could not be pinned to a request/response pair
      // you can decide to shutdown or do whatever you want
   }
   
});
```

If you wish to have separate handlers for uncaughtException, unhandledRejection, and a pure domain-trapped error, use:

```js
haven.emitter.on('exception', function (v: HavenException) {
    // there was an uncaughtException
});

haven.emitter.on('rejection', function (v: HavenRejection) {
    // there was an unhandledRejection
});

haven.emitter.on('trapped', function (v: HavenTrappedError) {
    // the runtime error was trapped by the domain error handler =>  d.once('error', function(e){});
});

```

where HavenException, HavenRejection and HavenTrappedError are as follows:

```typescript


export interface HavenTrappedError {
  message: string,
  domain?: Domain | null,
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
  domain: Domain| null,
  unhandledRejection: true,
  error: Error,
  request: Request | null
  response: Response | null,
  pinned: true | false,
  promise: Promise<any> | null
}

export type HavenBlunder = HavenException | HavenTrappedError | HavenRejection;

```



# Performance



# Usage



### If you just want to capture errors that don't make it to the global scope, use:

```js
app.use(haven({handleGlobalErrors: false}));
```

### To just show error messages, but not the full stack trace, use:

```js
app.use(haven({showStackTracesInResponse: false}));
```



# How it works:

What we do is use something similar to this beautiful piece of middleware:

```js 
const havenMiddleware = function (req, res, next) {
    
    const d = domain.create(); // create a new domain for this request
    
    res.once('finish', function () {
      d.exit();
    });
    
    d.once('error', function (e) {
      if (!res.headersSent) {
        res.status(500).json({
          error: util.inspect(e ? e.stack || e : e)
        });
      }
    });
    
    d.run(next);  // we invoke the next middleware
    
};

```
