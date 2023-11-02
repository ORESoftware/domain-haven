

const Domain = require('domain');


const d = Domain.create();

d.run(() => {
    console.log('running');
});


d.once('error', e => {
    console.error('domain caught:',e);
});


throw 'boop'