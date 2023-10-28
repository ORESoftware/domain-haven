

import * as server1 from './simple-server-1';
import * as server2 from './simple-server-2';
import * as server3 from './simple-server-3';

server1.app.on('haven/listening', (v) => {
  console.log('server1 is listening:', v);
});

server2.app.on('haven/listening', (v) => {
  console.log('server2 is listening:', v);
});

server3.app.on('haven/listening', (v) => {
  console.log('server3 is listening:', v);
});