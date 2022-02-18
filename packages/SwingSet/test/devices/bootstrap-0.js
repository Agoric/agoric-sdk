import { extractMessage } from '../vat-util.js';

export default (syscall, state, _helpers, vatPowers) => {
  const dispatch = vatDeliverObject => {
    const { args } = extractMessage(vatDeliverObject);
    vatPowers.testLog(args.body);
    vatPowers.testLog(JSON.stringify(args.slots));
  };
  return dispatch;
};
