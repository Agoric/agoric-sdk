const harden = require('@agoric/harden');

export default function setup(helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
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
