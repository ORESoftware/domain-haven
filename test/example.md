



First run this code:

```js
const exec = () => {
   setTimeout(() => {
      throw 'nothing can catch this, except domains';
   },10);
};


try{
  exec();
}
catch(err){
  console.error('Error was trapped by try/catch:', err);
}
```

You will notice that try/catch cannot trap the error. However if we use Node.js domains:

```js
const Domoain = require('domain');
const d = Domain.create();

d.once('error', err => {
  console.error('Error was trapped by the domain:', err);
});

d.run(exec);
```

Domains are useful for trapping errors thrown asynchronously. 
Using the global uncaughtException and unhandledRejection handlers don't solve the problem either.
Only Domains can catch arbitrary errors like this.


