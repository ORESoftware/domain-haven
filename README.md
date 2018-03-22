

# Domain-Haven

This is an awesome module for using Node.js domains to capture runtime errors and pin otherwise unpinnable errors to a particular request.


# Performance



# Usage

```js

import * as express from 'express';
import haven from 'domain-haven';

const app = express();
app.use(haven());

export {app};

```

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
