/* global harden */

function build(_E, log) {
  const thing = {
    answer() {
      log('=> Bob: in thing.answer1(), reply with string');
      return `Bob's thing answer`;
    },
  };
  return harden({
    getThing() {
      log('=> Bob: in getThing(), reply with thing');
      return thing;
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
