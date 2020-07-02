/* global harden */

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

function build(_E, _log) {
  let p;
  let r;
  return {
    genPromise() {
      [p, r] = makePR();
      return p;
    },
    usePromise(pa) {
      r(pa);
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
