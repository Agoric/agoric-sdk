import { extractMessage } from '../util';

export default function setup(syscall, state, _helpers, vatPowers) {
  function dispatch(vatDeliverObject) {
    const { args } = extractMessage(vatDeliverObject);
    vatPowers.testLog(args.body);
    vatPowers.testLog(JSON.stringify(args.slots));
  }
  return dispatch;
}
