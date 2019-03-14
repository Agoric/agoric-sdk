import harden from '@agoric/harden';

export default function setup(syscall, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  const { dispatch, registerRoot } = helpers.makeLiveSlots(
    syscall,
    helpers.vatID,
  );

  const obj0 = {
    bar(arg2) {
      log(`right ${arg2}`);
      return 4;
    },
  };
  registerRoot(harden(obj0));
  return dispatch;
}
