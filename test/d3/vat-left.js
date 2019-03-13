// const harden = require('@agoric/harden');

console.log(`left loaded`);

function dispatch(syscall, facetid, method, argsbytes, caps) {
  const t = syscall.getTarget(facetid);
  const args = syscall.unserialize(argsbytes, caps);
  t[method](...args);
}

export default function setup() {
  /*
  const { E } = syscall;
  syscall.log('left.start called');
  const t1 = {
    foo(arg1) {
      syscall.log(`left.foo ${arg1}`);
    },
    callRight(arg1) {
      syscall.log(`left.callRight`);
      E(arg1).bar('arg2');
    },
  };
  const t1exportID = syscall.registerTarget(t1);
  return harden([t1exportID]);
  */
  return dispatch;
}
