import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers, vatParameters) {
  log(`=> setup called`);
  return Far('root', {
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
      const count = vatParameters.argv[0] ? Number(vatParameters.argv[0]) : 10;
      E(vats.alice).grind('hey!', count);
    },
  });
}
