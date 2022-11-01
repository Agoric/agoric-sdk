import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  let bob;
  let p;
  function waitForNextResolution() {
    p.then(
      answer => {
        log(`Alice: Bob answers with value ${answer[0]}`);
        p = answer[1];
        E(bob).gen();
      },
      err => {
        log(`=> Alice: Bob rejected, ${err}`);
      },
    );
  }

  return Far('root', {
    bootstrap(vats) {
      bob = vats.bob;
      p = E(bob).init();
      E(bob).gen();
    },
    runBenchmarkRound() {
      waitForNextResolution();
    },
  });
}
