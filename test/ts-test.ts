abstract class Foo1 {
  abstract method1?(): void
}

class Foo2 {
  constructor(v: Foo2 | { bar: true }) {

  }

  method1?(): void
}

const x = new Foo2({
  method1() {

  },
  bar: true
})


//
// const f = new Foo2(){
//   method1(){
//      // implement -or- override existing method declarartion
//   }
// }


const f = new (class extends Foo1 {
  method1() {
    // implement -or- override existing method declarartion
  }
})();


// imaginary syt
const f2 = new Foo2({
  method1() {
    // implement -or- override existing method declarartion
  }
});