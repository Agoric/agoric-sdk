/* global harden */

console.log(`=> loading bootstrap.js`);

function build(E, log) {
  let bob;
  let p;
  function waitForNextResolution() {
    p.then(
      answer => {
        log(`Alice: Bob answers with value ${answer[0]}`);
        p = answer[1];
        E(bob).gen();
      },
      err => {
        log(`=> Alice: Bob rejected, ${err}`);
      },
    );
  }

  return {
    bootstrap(argv, vats) {
      bob = vats.bob;
      p = E(bob).init();
      E(bob).gen();
    },
    runBenchmarkRound() {
      waitForNextResolution();
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
