import * as haven from './main';


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

