import harden from '@agoric/harden';

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

function build(E, log) {
  let p1, r1;
  return {
    genPromise1() {
      return "Hello!";
    },
    genPromise2() {
      [p1, r1] = makePR();
      return p1;
    },
    usePromise(pa) {
      r1(pa);
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
