/* global harden */

function build(_E, log) {
  return harden({
    hello() {
      log(`=> Somebody said hello to Bob`);
      return 'hi there!';
    },
  });
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
