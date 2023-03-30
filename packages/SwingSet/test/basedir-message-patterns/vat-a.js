import { Far } from '@endo/far';
import { buildPatterns } from '../message-patterns.js';

export function buildRootObject(vatPowers) {
  const amy = Far('amy', {});
  let alice;

  const root = Far('root', {
    init(bob, bert, carol) {
      const { setA, setB, setC, objA } = buildPatterns(vatPowers.testLog);
      alice = objA;
      const a = harden({ alice, amy });
      setA(a);
      setB(harden({ bob, bert }));
      setC(harden({ carol }));
      return a;
    },

    async run(which) {
      await alice[which]();
    },
  });
  return root;
}
