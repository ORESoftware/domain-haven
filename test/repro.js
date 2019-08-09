'use strict';


const Domain = require('domain');
const d = Domain.create();

const util = require('util');

process.once('unhandledRejection', (r, p, d) => {
  console.log('unhandledRejection', r, p,d);
  console.log('aaa:',util.inspect(p));  // on version 9, 10, 11, p.domain is defined, on version 12, it is *undefined*
  console.log('bbb',d);
});

d.once('error', () => {
  console.log('domain caught');
});


d.run(() => {
  Promise.resolve(null).then(() => {
    throw 'foo';
  });
});