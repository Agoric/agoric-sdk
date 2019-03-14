const harden = require('@agoric/harden');

export default function setup(helpers) {
  const { log } = helpers;
  log(`right.setup called`);
  const { dispatch, registerRoot } = helpers.makeLiveSlots(helpers.vatID);

  const obj0 = {
    bar(arg2, self) {
      log(`right.obj0.bar ${arg2} ${self === obj0}`);
    },
  };
  registerRoot(harden(obj0));
  return dispatch;
}
