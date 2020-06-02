import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

function build(E, log) {
  let count;
  function waitFor(who, p) {
    p.then(
      answer => {
        if (0 < count && count < 50) {
          log(`Alice: Bob answers with value ${answer[0]}`);
        }
        if (answer[0] < count || count < 0) {
          E(who).gen();
          waitFor(who, answer[1]);
        }
      },
      err => {
        log(`=> Alice: Bob rejected, ${err}`);
      },
    );
  }

  return {
    bootstrap(argv, vats) {
      count = argv[0] ? Number(argv[0]) : 3;
      const bob = vats.bob;
      const p = E(bob).init();
      E(bob).gen();
      waitFor(bob, p);
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
