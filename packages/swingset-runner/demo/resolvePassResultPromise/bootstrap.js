import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats) {
      log('=> Alice: bootstrap() called');

      log('Alice: sending first to Bob');
      const p1 = E(vats.bob).first();
      log('Alice: sending second to Bob');
      const p2 = E(vats.bob).second(p1);
      log(`Alice: awaiting Bob's responses`);
      p1.then(
        r => log(`=> Alice: Bob's response to first resolved to '${r}'`),
        e => log(`=> Alice: Bobs' response to first rejected as '${e}'`),
      );
      p2.then(
        r => log(`=> Alice: Bob's response to second resolved to '${r}'`),
        e => log(`=> Alice: Bobs' response to second rejected as '${e}'`),
      );
      log('=> Alice: bootstrap() done');
      return 'Alice started';
    },
  });
}
