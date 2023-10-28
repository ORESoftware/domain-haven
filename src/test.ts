import * as haven from './main';

haven.middleware({
  opts: {auto: true}
});

haven.middleware(new haven.HavenHandler({
  opts: {auto: true},
  async onPinnedError(err, req, res) {

  }
}));

