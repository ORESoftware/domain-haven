

# Domain-Haven

### Caveat

Works on Node.js version before 12. Currently not working on Node.js version 12.

## About

This is an awesome module for using Node.js domains to capture runtime errors and <br>
pin errors / exceptions / unhandled-rejections to a particular request/response.

```js

import * as express from 'express';
import haven from 'domain-haven';

const app = express();
app.use(haven());

export {app};

```

### In Production

```bash
### use these env vars to switch off stack-traces from leaking sensitive data to client(s):

export NODE_ENV=prod
export NODE_ENV=production
export DOMAIN_HAVEN_PROD=true

```

alternatively, use this option to not reveal stack-traces programmatically:


```typescript

import * as haven from 'domain-haven';

haven.middleware({
  opts: {
    revealStackTraces: false
  }
});

// where the above is equivalent to:

import haven from 'domain-haven';

haven({
  opts: {
    revealStackTraces: false
  }
});



```
### In Production, continued:

In some rare cases, we may wish to enable stack traces shown to the client for a particular request.
You can override behavior for a particular request by doing this:


```typescript

app.use((req,res,next) => {
  if(req.query.secret === 'magic-spell'){  // you control this, serverside
    req.havenOpts = {revealStackTraces: true, overrideProd: true};
  }
  next()
});

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
app.use(haven({opts:{auto:false}}));


```



# Performance
TBD


# Usage
TBD


### If you just want to capture errors that don't make it to the global scope, use:

```js
app.use(haven({handleGlobalErrors: false}));
```

### To just show error messages, but not the full stack trace, use:

```js
app.use(haven({showStackTracesInResponse: false}));
```



## How it works:

What we do is use something similar to this beautiful piece of middleware:

```js 
const havenMiddleware = function (req, res, next) {
    
    const d = domain.create(); // create a new domain for this request
    
    res.once('finish', () => {
      d.exit();
    });
    
    d.once('error',  (e) => {
        res.status(500).json({error: e});
    });
    
    d.run(next);  // we invoke the next middleware
    
};

```
