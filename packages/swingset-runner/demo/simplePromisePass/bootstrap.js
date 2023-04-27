import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats) {
      log('=> Bootstrap: bootstrap() called');
      // prettier-ignore
      E(vats.alice)
        .sendPromiseTo(vats.bob)
        .then(
          r => log(`=> Bootstrap: alice.sendPromiseTo(bob) resolved to '${r}'`),
          e => log(`=> Bootstrap: alice.sendPromiseTo(bob) rejected as '${e}'`),
        );
      log('=> Bootstrap: bootstrap() done');
    },
  });
}
