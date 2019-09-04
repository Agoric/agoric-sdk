import harden from '@agoric/harden';
import { buildPatterns } from '../message-patterns';

function build(E, log) {
  const amy = harden({ toString: () => 'obj-amy' });
  let alice;

  const root = harden({
    init(bob, bert) {
      const { setA, setB, objA } = buildPatterns(E, log);
      alice = objA;
      const a = harden({ alice, amy });
      setA(a);
      setB(harden({ bob, bert }));
      return a;
    },

    async run(which) {
      console.log(`running alice[${which}]`);
      await alice[which]();
    },
  });
  return root;
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
