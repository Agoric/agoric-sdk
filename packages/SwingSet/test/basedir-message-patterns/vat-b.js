/* global harden */

import { buildPatterns } from '../message-patterns';

function build(log) {
  const bert = harden({ toString: () => 'obj-bert' });
  const bill = harden({ toString: () => 'obj-bill' });

  const root = harden({
    init() {
      const { setB, objB } = buildPatterns(log);
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
    _vatPowers => build(helpers.log),
    helpers.vatID,
  );
}
