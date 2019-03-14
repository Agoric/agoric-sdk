const harden = require('@agoric/harden');

export default function setup(helpers) {
  const { log } = helpers;
  const { dispatch, registerRoot } = helpers.makeLiveSlots(helpers.vatID);

  const obj0 = {
    bar(arg2) {
      log(`right ${arg2}`);
      return 4;
    },
  };
  registerRoot(harden(obj0));
  return dispatch;
}
