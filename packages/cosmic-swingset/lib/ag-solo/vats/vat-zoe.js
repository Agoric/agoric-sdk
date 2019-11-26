import harden from '@agoric/harden';

import { makeZoe } from '@agoric/ertp/core/zoe/zoe/zoe';

const build = (_E, _log) => {
  const zoe = makeZoe({ require });
  return harden({
    getZoe: () => zoe,
  });
};

harden(build);

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
export default harden(setup);
