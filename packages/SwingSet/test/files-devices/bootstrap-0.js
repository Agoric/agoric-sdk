/* global harden */

export default function setup(syscall, state, helpers, _vatPowers0) {
  const log = helpers.testLog;
  const dispatch = harden({
    deliver(facetid, method, args, _result) {
      log(args.body);
      log(JSON.stringify(args.slots));
    },
  });
  return dispatch;
}
