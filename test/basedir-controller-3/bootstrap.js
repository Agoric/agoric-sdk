import harden from '@agoric/harden';

console.log(`loading bootstrap`);

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  log(`bootstrap called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        bootstrap(argv, vats) {
          helpers.log(`bootstrap.obj0.bootstrap()`);
          console.log(`obj0.bootstrap`, argv, vats);
          E(vats.left).foo(1, vats.right);
        },
      }),
    helpers.vatID,
  );
}
