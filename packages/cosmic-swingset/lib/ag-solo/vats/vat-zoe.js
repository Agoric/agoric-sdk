import harden from '@agoric/harden';

import { makeZoe } from '@agoric/zoe';

const build = (vatPowers, _E, _log) => {
  const zoe = makeZoe({}, vatPowers);
  return harden({
    getZoe: () => zoe,
  });
};

harden(build);

function setup(syscall, state, helpers, vatPowers0) {
  function log(...args) {
    helpers.log(...args);
    console.debug(...args);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, _D, vatPowers) => build(vatPowers, E, log),
    helpers.vatID,
    vatPowers0,
  );
}
export default harden(setup);
