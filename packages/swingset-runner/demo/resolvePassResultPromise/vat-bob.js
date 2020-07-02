/* global harden */

function build(_E, log) {
  let resolver;
  return {
    first() {
      log('=> Bob: in first');
      const answer = new Promise((theResolver, _theRejector) => {
        resolver = theResolver;
      });
      return answer;
    },
    second(p) {
      log('=> Bob: second begins');
      resolver('Bob answers first in second');
      p.then(
        r => log(`=> Bob: the parameter to second resolved to '${r}'`),
        e => log(`=> Bob: the parameter to second rejected as '${e}'`),
      );
      log('=> Bob: second done');
      return `Bob's second answer`;
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
    E => harden(build(E, log)),
    helpers.vatID,
  );
}
