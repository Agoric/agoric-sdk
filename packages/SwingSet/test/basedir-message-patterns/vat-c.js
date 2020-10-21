import { buildPatterns } from '../message-patterns';

export function buildRootObject(vatPowers) {
  const root = harden({
    init() {
      const { setC, objC: carol } = buildPatterns(vatPowers.testLog);
      const c = harden({ carol });
      setC(c);
      return harden({ carol });
    },
  });
  return root;
}
