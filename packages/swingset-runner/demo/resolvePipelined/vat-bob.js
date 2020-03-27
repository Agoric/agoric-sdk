import harden from '@agoric/harden';

function build(_E, log) {
  let resolver;
  const thing = {
    second() {
      log('=> Bob: in thing.second(), reply with string');
      return `Bob's second answer`;
    },
  }
  return harden({
    first() {
      log('=> Bob: in first(), reply with thing');
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
