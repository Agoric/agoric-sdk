import harden from '@agoric/harden';

console.log(`loading bootstrap.js`);

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        bootstrap(argv, vats) {
          console.log('bootstrap() called');
          E(vats.left)
            .callRight(1, vats.right)
            .then(r => log(`b.resolved ${r}`), err => log(`b.rejected ${err}`));
        },
      }),
    helpers.vatID,
  );
}
