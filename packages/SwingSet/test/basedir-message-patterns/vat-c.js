import { Far } from '@agoric/marshal';
import { buildPatterns } from '../message-patterns';

export function buildRootObject(vatPowers) {
  const root = Far('root', {
    init() {
      const { setC, objC } = buildPatterns(vatPowers.testLog);
      const carol = Far('carol', objC);
      const c = harden({ carol });
      setC(c);
      return harden({ carol });
    },
  });
  return root;
}
