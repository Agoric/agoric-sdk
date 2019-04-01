import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  log(`right.setup called`);
  const { dispatch, registerRoot } = helpers.makeLiveSlots(
    syscall,
    state,
    helpers.vatID,
  );

  const obj0 = {
    bar(arg2, self) {
      log(`right.obj0.bar ${arg2} ${self === obj0}`);
      return 3;
    },
  };
  registerRoot(harden(obj0));
  return dispatch;
}
