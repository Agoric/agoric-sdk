import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

function build(E, log) {
  const target1 = {
    one(_p) {
      log(`target1 in one`);
    },
    two() {
      log(`target1 in two`);
    },
    three(_p) {
      log(`target1 in three`);
    },
    four() {
      log(`target1 in four`);
    },
  };
  const target2 = {
    one(_p) {
      log(`target2 in one`);
    },
    two() {
      log(`target2 in two`);
    },
    three(_p) {
      log(`target2 in three`);
    },
    four() {
      log(`target2 in four`);
    },
  };
  return {
    bootstrap(argv, vats) {
      const bob = vats.bob;
      const p1 = E(bob).result();
      E(bob).promise(p1);
      E(bob).run(target1, target2);
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
