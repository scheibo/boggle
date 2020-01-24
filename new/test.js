class Foo {
  constructor() {
    this.a = 'a';
    addListener(this.onFoo.bind(this));
  }

  onFoo() {
    console.log(this.a);
  }
}

var LISTENER;
function addListener(fn) {
  LISTENER = fn;
}

const foo = new Foo();
LISTENER();
