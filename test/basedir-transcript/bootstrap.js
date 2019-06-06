import harden from '@agoric/harden';

console.log(`loading bootstrap`);

function build(E, log) {
  return harden({
    bootstrap(argv, vats) {
      const mode = argv[0];
      if (mode === 'one') {
        E(vats.left)
          .callRight(1, vats.right)
          .then(r => log(`b.resolved ${r}`), err => log(`b.rejected ${err}`));
      } else {
        throw Error(`unknown mode ${mode}`);
      }
    },
  });
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`bootstrap called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
