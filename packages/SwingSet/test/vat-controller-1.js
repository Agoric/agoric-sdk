// -*- js -*-
import { extractMessage } from './vat-util';

export default (syscall, _state, _helpers, vatPowers) => {
  const dispatch = vatDeliverObject => {
    if (vatDeliverObject[0] === 'message') {
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      vatPowers.testLog(JSON.stringify({ target: facetID, method, args }));
    }
  };
  return dispatch;
};
