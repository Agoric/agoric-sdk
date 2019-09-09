const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers, _devices) {
  const { log } = helpers;
  const dispatch = harden({
    deliver(facetid, method, argsbytes, caps, _result) {
      log(argsbytes);
      log(JSON.stringify(caps));
    },
  });
  return dispatch;
}
