/* global harden */

function build(_E, log) {
  return harden({
    thisIsYourPromise(p) {
      log('=> Bob: thisIsYourPromise begins');
      p.then(
        r => log(`=> Bob: the promise parameter resolved to '${r}'`),
        e => log(`=> Bob: the promise parameter rejected as '${e}'`),
      );
      log('=> Bob: thisIsYourPromise done');
      return 'Bob got the promise';
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
