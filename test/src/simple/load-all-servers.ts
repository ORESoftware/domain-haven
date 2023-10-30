#!/usr/bin/env ts-node

import * as server1 from './simple-server-1';
import * as server2 from './simple-server-2';
import * as server3 from './simple-server-3';
import * as server4 from './simple-server-4';


server1.app.on('haven/listening', (v: any) => {
  console.log('server1 is listening:', v);
});

server2.app.on('haven/listening', (v: any) => {
  console.log('server2 is listening:', v);
});

server3.app.on('haven/listening', (v: any) => {
  console.log('server3 is listening:', v);
});


server4.app.on('haven/listening', (v: any) => {
  console.log('server4 is listening:', v);
});