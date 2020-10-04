export default function setup(syscall, state, _helpers, vatPowers) {
  const dispatch = harden({
    deliver(facetid, method, args, _result) {
      vatPowers.testLog(args.body);
      vatPowers.testLog(JSON.stringify(args.slots));
    },
  });
  return dispatch;
}
