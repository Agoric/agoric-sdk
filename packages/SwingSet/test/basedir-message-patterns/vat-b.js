import { buildPatterns } from '../message-patterns';

export function buildRootObject(vatPowers) {
  const bert = harden({ toString: () => 'obj-bert' });
  const bill = harden({
    toString: () => 'obj-bill',
    log_bill(msg) {
      vatPowers.testLog(msg);
    },
  });

  const root = harden({
    init() {
      const { setB, objB: bob } = buildPatterns(vatPowers.testLog);
      const b = harden({ bob, bert, bill });
      setB(b);
      return harden({ bob, bert });
    },
  });
  return root;
}
