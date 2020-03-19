import harden from '@agoric/harden';

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

function build(log_) {
  let r = null;
  let value = 0;
  return {
    init() {
      let p;
      [p, r] = makePR();
      return p;
    },
    gen() {
      let [p, newR] = makePR();
      let answer = [value, p];
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
    () => harden(build(log)),
    helpers.vatID,
  );
}
