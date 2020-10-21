import { buildPatterns } from '../message-patterns';

export function buildRootObject(vatPowers) {
  const amy = harden({ toString: () => 'obj-amy' });
  let alice;

  const root = harden({
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
