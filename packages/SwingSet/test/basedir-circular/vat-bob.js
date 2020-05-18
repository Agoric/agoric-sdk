import harden from '@agoric/harden';

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

function build(_E, _log) {
  let p1;
  let r1;
  let p2;
  let r2;
  return {
    genPromise1() {
      [p1, r1] = makePR();
      return p1;
    },
    genPromise2() {
      [p2, r2] = makePR();
      return p2;
    },
    usePromises(pa, pb) {
      r1(pb);
      r2(pa);
    },
  };
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => harden(build(E, helpers.log)),
    helpers.vatID,
  );
}
