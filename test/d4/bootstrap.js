import harden from '@agoric/harden';

console.log(`loading bootstrap`);

export default function setup(syscall, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`bootstrap called`);
  const { E, dispatch, registerRoot } = helpers.makeLiveSlots(
    syscall,
    helpers.vatID,
  );
  const obj0 = {
    bootstrap(argv, vats) {
      if (argv[0] === 'flush') {
        Promise.resolve().then(log('then1'));
        Promise.resolve().then(log('then2'));
      } else if (argv[0] === 'e-then') {
        E(vats.left)
          .callRight(1, vats.right)
          .then(r => log(`b.resolved ${r}`), err => log(`b.rejected ${err}`));
      } else {
        throw Error(`unknown argv ${argv[0]}`);
      }
    },
  };

  registerRoot(harden(obj0));
  return dispatch;
}
