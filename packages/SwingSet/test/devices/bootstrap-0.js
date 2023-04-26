import { extractMessage } from '../vat-util.js';

export default function setup(syscall, state, _helpers, vatPowers) {
  function dispatch(vatDeliverObject) {
    if (vatDeliverObject[0] === 'message') {
      const { args } = extractMessage(vatDeliverObject);
      vatPowers.testLog(JSON.stringify(args));
    }
  }
  return dispatch;
}
