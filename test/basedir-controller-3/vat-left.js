import harden from '@agoric/harden';

console.log(`left loaded`);

export default function setup(syscall, helpers) {
  const { log } = helpers;
  log(`left.setup called`);
  const { E, dispatch, registerRoot } = helpers.makeLiveSlots(
    syscall,
    helpers.vatID,
  );

  const t1 = {
    foo(arg1, right) {
      log(`left.foo ${arg1}`);
      E(right).bar(2, right);
    },
  };
  registerRoot(harden(t1));
  return dispatch;
}
