/* global harden */

import { E } from '@agoric/eventual-send';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers, options) {
  log(`=> setup called`);
  return harden({
    bootstrap(vats) {
      console.log('=> bootstrap() called');
      E(vats.alice).setNickname('alice');
      E(vats.bob).setNickname('bob');
      E(vats.alice)
        .introduceYourselfTo(vats.bob)
        .then(
          r => log(`=> alice.introduceYourselfTo(bob) resolved to '${r}'`),
          e => log(`=> alice.introduceYourselfTo(bob) rejected as '${e}'`),
        );
      const count = options.argv[0] ? Number(options.argv[0]) : 10;
      E(vats.alice).grind('hey!', count);
    },
  });
}
