import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        callRight(arg1, right) {
          log(`left.callRight ${arg1}`);
          E(right)
            .bar(2)
            .then(a => log(`left.then ${a}`));
          return 3;
        },
      }),
    helpers.vatID,
  );
}
