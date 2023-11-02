

const ahd = require('async-hook-domain');

const d = new ahd.Domain(err => {
    console.error('AHD caught:',err);
});


throw 'boop'