/* global harden */

function build(_E, log) {
  return harden({
    first() {
      log('=> Bob: in first');
      return `Bob's first answer`;
    },
    second(p) {
      log('=> Bob: second begins');
      p.then(
        r => log(`=> Bob: the parameter to second resolved to '${r}'`),
        e => log(`=> Bob: the parameter to second rejected as '${e}'`),
      );
      log('=> Bob: second done');
      return `Bob's second answer`;
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
