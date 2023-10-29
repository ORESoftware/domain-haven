import * as haven from './main';

import * as Emitter from 'events';

haven.middleware({
  opts: {
    auto: true,
    revealStackTraces: false
  }
});

haven.middleware(new haven.HavenHandler({
  opts: {auto: true},
  async onPinnedError(err, req, res) {

  }
}));


const e = new Emitter();

const v = e.on('foo', async () => {
   const x = await 3;
   console.log(x+3);
});

console.log(v);

e.emit('foo');