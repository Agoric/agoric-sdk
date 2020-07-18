/* global harden */

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    _vatPowers =>
      harden({
        bar(arg2) {
          log(`right ${arg2}`);
          return 4;
        },
      }),
    helpers.vatID,
  );
}
