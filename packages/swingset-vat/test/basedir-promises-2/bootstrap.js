import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@endo/marshal';
import { assert, details as X } from '@agoric/assert';

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;
  return Far('root', {
    bootstrap(vats) {
      const { argv } = vatParameters;
      const mode = argv[0];
      if (mode === 'harden-promise-1') {
        const { promise: p1 } = makePromiseKit();
        harden(p1);
        const allP = [];
        // in bug #95, this first call returns a (correctly) frozen Promise,
        // but for the wrong reasons
        const p2 = E(vats.left).checkHarden(p1);
        log(`p2 frozen ${Object.isFrozen(p2)}`);
        allP.push(p2);
        // but this one does not:
        const p3 = E(p2).checkHarden(p1);
        log(`p3 frozen ${Object.isFrozen(p3)}`);
        allP.push(p3);
        // TODO: this one doesn't get frozen, but we wish it did
        // const p4 = vats.left!checkHarden(p1);
        // log(`p4 frozen ${Object.isFrozen(p4)}`);
        // allP.push(p4);
        Promise.all(allP).then(_ => {
          log(`b.harden-promise-1.finish`);
        });
      } else {
        assert.fail(X`unknown mode ${mode}`);
      }
    },
  });
}
