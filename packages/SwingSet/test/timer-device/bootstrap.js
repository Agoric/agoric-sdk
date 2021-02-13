import { assert, details as X } from '@agoric/assert';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  const log = vatPowers.testLog;
  return harden({
    async bootstrap(vats, devices) {
      const { argv } = vatParameters;
      if (argv[0] === 'timer') {
        log(`starting wake test`);
        const handler = harden({
          wake() {
            log(`handler.wake()`);
          },
        });
        D(devices.timer).setWakeup(3, handler);
      } else if (argv[0] === 'repeater') {
        log(`starting repeater test`);
        let handlerCalled = 0;
        const handler = harden({
          wake(h) {
            handlerCalled += 1;
            log(
              `handler.wake(${h || 'handler'}) called ${handlerCalled} times.`,
            );
          },
        });
        const rptr = D(devices.timer).makeRepeater(argv[1], argv[2]);
        const nextTime = D(devices.timer).schedule(rptr, handler);
        log(`next scheduled time: ${nextTime}`);
      } else {
        assert.fail(X`unknown argv mode '${argv[0]}'`);
      }
    },
  });
}
