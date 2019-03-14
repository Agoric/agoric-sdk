const harden = require('@agoric/harden');

export default function setup(helpers) {
  const { log } = helpers;
  const { E, dispatch, registerRoot } = helpers.makeLiveSlots(helpers.vatID);

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
