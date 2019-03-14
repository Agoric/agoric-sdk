const harden = require('@agoric/harden');

console.log(`left loaded`);

export default function setup(helpers) {
  const { log } = helpers;
  log(`left.setup called`);
  const { E, dispatch, registerRoot } = helpers.makeLiveSlots(helpers.vatID);

  const t1 = {
    foo(arg1, right) {
      log(`left.foo ${arg1}`);
      E(right).bar(2, right);
    },
  };
  registerRoot(harden(t1));
  return dispatch;
}
