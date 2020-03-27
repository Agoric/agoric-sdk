import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        bootstrap(argv, vats) {
          console.log('=> bootstrap() called');
          E(vats.alice)
            .sayHelloTo(vats.bob)
            .then(
              r => log(`=> alice.hello(bob) resolved to '${r}'`),
              e => log(`=> alice.hello(bob) rejected as '${e}'`),
            );
        },
      }),
    helpers.vatID,
  );
}
