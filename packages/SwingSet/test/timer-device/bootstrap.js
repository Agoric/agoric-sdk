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
        const rptr = D(devices.timer).createRepeater(argv[1], argv[2]);
        D(devices.timer).schedule(rptr, handler);
      } else {
        throw new Error(`unknown argv mode '${argv[0]}'`);
      }
    },
  });
}
