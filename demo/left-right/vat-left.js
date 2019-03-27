import harden from '@agoric/harden';

export default function setup(syscall, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  const { E, dispatch, registerRoot } = helpers.makeLiveSlots(
    syscall,
    helpers.vatID,
  );

  const t1 = {
    callRight(arg1, right) {
      log(`left.callRight ${arg1}`);
      E(right)
        .bar(2)
        .then(a => log(`left.then ${a}`));
      return 3;
    },
  };
  registerRoot(harden(t1));
  return dispatch;
}
