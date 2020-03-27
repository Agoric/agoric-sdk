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
          console.log('=> Bootstrap: bootstrap() called');
          // prettier-ignore
          E(vats.alice)
            .sendPromiseTo(vats.bob)
            .then(
              r => log(`=> Bootstrap: alice.sendPromiseTo(bob) resolved to '${r}'`),
              e => log(`=> Bootstrap: alice.sendPromiseTo(bob) rejected as '${e}'`),
            );
          console.log('=> Bootstrap: bootstrap() done');
        },
      }),
    helpers.vatID,
  );
}
