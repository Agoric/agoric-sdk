const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers, _devices) {
  const { log } = helpers;
  const dispatch = harden({
    deliver(facetid, method, args, _result) {
      log(args.body);
      log(JSON.stringify(args.slots));
    },
  });
  return dispatch;
}
