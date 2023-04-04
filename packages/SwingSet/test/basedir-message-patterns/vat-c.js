import { Far } from '@endo/far';
import { buildPatterns } from '../message-patterns.js';

export function buildRootObject(vatPowers) {
  const root = Far('root', {
    init() {
      const { setC, objC } = buildPatterns(vatPowers.testLog);
      const carol = objC;
      const c = harden({ carol });
      setC(c);
      return harden({ carol });
    },
  });
  return root;
}
