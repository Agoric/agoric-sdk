/* global harden */

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

function build(_E, _log) {
  let r = null;
  let value = 0;
  return {
    init() {
      let p;
      // eslint-disable-next-line prefer-const
      [p, r] = makePR();
      return p;
    },
    gen() {
      // eslint-disable-next-line prefer-const
      let [p, newR] = makePR();
      const answer = [value, p];
      value += 1;
      r(answer);
      r = newR;
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
