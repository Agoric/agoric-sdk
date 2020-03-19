import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

function build(E, log) {
  return {
    bootstrap(argv, vats) {
      const pa = E(vats.bob).genPromise1();
      const pb = E(vats.bob).genPromise2();
      const pc = E(vats.bob).usePromise([pa]);
    },
  };
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => harden(build(E, log)),
    helpers.vatID,
  );
}
