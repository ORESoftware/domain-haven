

const v = {
    a: true,
    b: false,
    c: {
        hi: true,
        bye: false
    }
};

let b = null;
console.log(b = Object.assign({}, v, {a: false, c: null}));
console.log(v);