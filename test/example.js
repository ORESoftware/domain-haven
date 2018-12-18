


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



const Domain = require('domain');
const d = Domain.create();

d.once('error', err => {
  console.error('Error was trapped by the domain:', err);
});

d.run(exec);
