
//
// const v = {
//     a: true,
//     b: false,
//     c: {
//         hi: true,
//         bye: false
//     }
// };
//
// let b = null;
// console.log(b = Object.assign({}, v, {a: false, c: null}));
// console.log(v);


const n = new Error('foo');
n.bar = 'bar';
console.log(n); // doesn't show {stack: "", message:"" }

const x = Object.assign({}, n)
console.log(x); //{ bar: 'bar' }

console.log(x instanceof Error);


