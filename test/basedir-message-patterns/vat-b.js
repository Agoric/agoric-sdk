import harden from '@agoric/harden';
import { buildPatterns } from '../message-patterns';

function build(E, log) {
  const bert = harden({ toString: () => 'obj-bert' });
  const bill = harden({ toString: () => 'obj-bill' });

  const root = harden({
    init() {
      const { setB, objB } = buildPatterns(E, log);
      const b = harden({ bob: objB, bert, bill });
      setB(b);
      return harden({ bob: objB, bert });
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
