
const Domain = require('domain');

const logCurrentDomain = (v) => {
    console.log('current domain: ', v, process.domain && process.domain.id);
};

const v = 1;
const d = Domain.create();
d.id = v;

d.once('error', (e) =>{
    logCurrentDomain(v);
    console.log(v,{e});
    throw `num: ${v}`;
});

d.run(() => {

    const v = 2;

    const d = Domain.create();
    d.id = v;

    d.once('error',(e)=> {
        logCurrentDomain(v);
        console.log(v, {e});
        throw `num: ${v}`;
    });

    d.run(() => {

        const v = 3;
        const d = Domain.create();
        d.id = v;

        d.once('error',(e)=> {
            logCurrentDomain(v);
            console.log(v, {e});
            throw `num: ${v}`;
        });

        d.run(() => {

            const v = 4;
            const d = Domain.create();
            d.id = v;

            d.once('error',(e)=> {
                logCurrentDomain(v);
                console.log(v, {e});
                throw `num: ${v}`;
            });

            d.run(() => {

                const v = 5;
                const d = Domain.create();
                d.id = v;

                d.once('error',(e)=> {
                    logCurrentDomain(v);
                    console.log(v, {e});
                    throw `num: ${v}`;
                });

                d.run(() => {

                    const v = 6;
                    const d = Domain.create();
                    d.id = v;

                    d.once('error',(e)=> {
                        logCurrentDomain(v);
                        console.log(v, {e});
                        throw `num: ${v}`;
                    });

                    d.run(() => {
                        logCurrentDomain(v);
                        throw 'abc'
                    });
                });

            });

        });

    });

})


