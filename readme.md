

# Domain-Haven

### Compatibility and security caveat

CI verifies Node.js **22, 24 and 26** on Ubuntu 24.04: locked TypeScript compilation, 23 executable runtime/security regressions including real Express loopback HTTP and fatal child-process tests, production dependency audit, and a separately installed npm tarball consumer. This is evidence for those tested environments, **not** a guarantee of full production compatibility, Windows/macOS behavior, supervisor integration or npm registry publication. Node.js domains are a legacy API.

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

### Error disclosure policy

**Stack traces and original errors are redacted by default** for all environments. This applies to `haven()` and to handlers without an explicit disclosure policy.

For local **development only**, the server may intentionally opt in to debug traces:

```typescript
import {haven, HavenHandler} from 'domain-haven';

app.use(haven(new HavenHandler({
  opts: {revealStackTraces: true}
})));
```

In production (`NODE_ENV=production`, `NODE_ENV=prod`, or `DOMAIN_HAVEN_PROD=true`), debug traces remain redacted even with `revealStackTraces: true` unless a trusted operator **also** sets the server environment variable `DOMAIN_HAVEN_PROD_OVERRIDE=true`. Do not enable this override in public-facing deployments.

**Request-derived data cannot enable debug traces.** `req.havenOpts.revealStackTraces` may narrow an existing server opt-in, but it cannot elevate a redacted server policy. `req.havenOpts.overrideProd`, including values populated from URL/query parameters, never authorizes production disclosure. The legacy `overrideProd` option remains in the TypeScript interface for compatibility but is not an authorization mechanism.

# Behavior

If an error is pinned to an active request, Domain-Haven attempts to send a redacted JSON error response only while the response is writable. Errors after headers are committed or after a disconnect do not trigger a second HTTP response.

**Global exception policy:** when Domain-Haven's global uncaught-exception listener is enabled, an uncaught exception without an active request, or from an already-handled domain, terminates the Node.js process with a nonzero exit code. An uncaught exception is not safe to recover from merely because it was logged. A service supervisor must handle process restart and traffic draining. Pinned request errors retain their existing response behavior. The same fail-closed exit rule now applies to unhandled Promise rejections with no active request or an already-handled domain. A rejection pinned to a still-active request can still produce a redacted HTTP 500, but orphan rejections terminate with exit code 1. This is intentionally stricter than continuing after an unhandled rejection; supervise Node processes for restarts. Node.js domains are not a substitute for process isolation.

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
app.use(haven(new HavenHandler({opts:{handleGlobalErrors: false}})));
```

### To just show error messages, but not the full stack trace, use:

```js
app.use(haven(new HavenHandler({opts:{revealStackTraces: false}})));
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
        if (!res.headersSent && !res.writableEnded && !res.destroyed) {
          res.status(500).json({error: 'Internal Server Error'});
        }
    });
    
    d.run(next);  // we invoke the next middleware
    
};

```
