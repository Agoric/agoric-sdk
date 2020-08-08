/* global harden */

import { E } from '@agoric/eventual-send';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers) {
  log(`=> setup called`);
  return harden({
    bootstrap(vats) {
      log('=> Alice: bootstrap() called');
      const thingE = E(vats.bob).getThing();
      log('=> Alice: called bob.getThing()');
      E(thingE)
        .answer()
        .then(
          r => {
            log(`=> Alice: thing.answer #1 resolved to '${r}'`);
            E(thingE)
              .answer()
              .then(
                r2 => log(`=> Alice: thing.answer #2 resolved to '${r2}'`),
                e => log(`=> Alice: thing.answer #2 rejected as '${e}'`),
              );
          },
          e => log(`=> Alice: thing.answer #1 rejected as '${e}'`),
        );
      log('=> Alice: bootstrap() done');
      return 'Alice started';
    },
  });
}
