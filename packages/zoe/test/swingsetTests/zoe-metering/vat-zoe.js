import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';

const build = (vatPowers, _E, _log) => {
  const zoe = makeZoe({}, vatPowers);
  return harden({
    getZoe: () => zoe,
  });
};

harden(build);

function setup(syscall, state, helpers, vatPowers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, _D, vatPowers) => build(vatPowers, E, log),
    helpers.vatID,
    vatPowers,
  );
}
export default harden(setup);
