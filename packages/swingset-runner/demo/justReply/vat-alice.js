/* global harden */

function build(E, log) {
  return harden({
    sayHelloTo(other) {
      log(`=> Alice.sayHelloTo`);
      const answer = E(other).hello();
      answer.then(
        r => log(`=> alice.hello() answer resolved to '${r}'`),
        e => log(`=> alice.hello() answer rejected as '${e}'`),
      );
      return `Alice started\n`;
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
