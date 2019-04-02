import harden from '@agoric/harden';

console.log(`loading bootstrap`);

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`bootstrap called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        bootstrap(argv, vats) {
          E(vats.left)
            .callRight(1, vats.right)
            .then(r => log(`b.resolved ${r}`), err => log(`b.rejected ${err}`));
        },
      }),
    helpers.vatID,
  );
}
