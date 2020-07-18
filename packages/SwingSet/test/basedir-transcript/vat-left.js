/* global harden */
import { E } from '@agoric/eventual-send';

function build(log) {
  const obj0 = {
    callRight(arg1, right) {
      log(`left.callRight ${arg1}`);
      E(right)
        .bar(2)
        .then(a => log(`left.then ${a}`));
      return 3;
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
