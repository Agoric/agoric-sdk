import { Far } from '@endo/far';
import { buildPatterns } from '../message-patterns.js';

export function buildRootObject(vatPowers) {
  const bert = Far('bert', {
    toString: () => 'obj-bert',
    log_bert: msg => {
      vatPowers.testLog(msg);
    },
  });
  const bill = Far('bill', {
    toString: () => 'obj-bill',
    log_bill(msg) {
      vatPowers.testLog(msg);
    },
  });

  const root = Far('root', {
    init() {
      const { setB, objB } = buildPatterns(vatPowers.testLog);
      const bob = objB;
      const b = harden({ bob, bert, bill });
      setB(b);
      return harden({ bob, bert });
    },
  });
  return root;
}
