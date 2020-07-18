/* global harden */

function build(log) {
  const obj0 = {
    checkHarden(o1) {
      log(`o1 frozen ${Object.isFrozen(o1)}`);
      return harden(obj0);
    },
  };
  return harden(obj0);
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    _vatPowers => build(helpers.log),
    helpers.vatID,
  );
}
