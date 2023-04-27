import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers, options) {
  let count;
  function waitFor(who, p) {
    p.then(
      answer => {
        if (count > 0 && count < 50) {
          log(`Alice: Bob answers with value ${answer[0]}`);
        }
        if (answer[0] < count || count < 0) {
          E(who).gen();
          waitFor(who, answer[1]);
        }
      },
      err => {
        log(`=> Alice: Bob rejected, ${err}`);
      },
    );
  }

  return Far('root', {
    bootstrap(vats) {
      count = options.argv[0] ? Number(options.argv[0]) : 3;
      const bob = vats.bob;
      const p = E(bob).init();
      E(bob).gen();
      waitFor(bob, p);
    },
  });
}
