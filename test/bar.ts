


import {MakeGet, MakePut} from './foo'

export interface Bar extends MakePut.Response{

}

const getEnumVal = (val: any) =>{
  return {foo: val};
};


enum Foo  {
  bar = 3,
  for = 2
}


const usesEnum = (e: typeof Foo) => {

};

usesEnum({
  bar:3,
  for:2
});