import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  const log = vatPowers.testLog;
  return Far('root', {
    async bootstrap(vats, devices) {
      const { argv } = vatParameters;
      if (argv[0] === 'timer') {
        log(`starting wake test`);
        const handler = Far('handler', {
          wake() {
            log(`handler.wake()`);
          },
        });
        D(devices.timer).setWakeup(3n, handler);
      } else if (argv[0] === 'repeater') {
        log(`starting repeater test`);
        let handlerCalled = 0;
        const handler = Far('handler', {
          wake(h) {
            handlerCalled += 1;
            log(
              `handler.wake(${h || 'handler'}) called ${handlerCalled} times.`,
            );
          },
        });
        const rptr = D(devices.timer).makeRepeater(Nat(argv[1]), Nat(argv[2]));
        const nextTime = D(devices.timer).schedule(rptr, handler);
        log(`next scheduled time: ${nextTime}`);
      } else {
        assert.fail(X`unknown argv mode '${argv[0]}'`);
      }
    },
  });
}
