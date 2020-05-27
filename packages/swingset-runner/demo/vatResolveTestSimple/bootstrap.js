import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

function build(E, log) {
  const target = {
    one() {
      log(`target in one`);
    },
    two() {
      log(`target in two`);
    },
  };
  return {
    bootstrap(argv, vats) {
      const bob = vats.bob;
      const p1 = E(bob).result();
      E(bob).promise(p1);
      E(bob).run(target);
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
