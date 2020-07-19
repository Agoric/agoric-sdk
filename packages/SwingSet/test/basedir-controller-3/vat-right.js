/* global harden */

function build(testLog) {
  const obj0 = {
    bar(arg2, self) {
      testLog(`right.obj0.bar ${arg2} ${self === obj0}`);
      return 3;
    },
  };
  return harden(obj0);
}

export default function setup(syscall, state, helpers, vatPowers0) {
  helpers.testLog(`right.setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    vatPowers => build(vatPowers.testLog),
    helpers.vatID,
    vatPowers0,
  );
}
