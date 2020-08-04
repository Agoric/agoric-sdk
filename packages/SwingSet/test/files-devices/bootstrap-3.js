/* global harden */

export function buildRootObject(vatPowers, vatOptions) {
  const { D, testLog: log } = vatPowers;
  return harden({
    async bootstrap(vats, devices) {
      if (vatOptions.argv[0] === 'write+read') {
        log(`w+r`);
        D(devices.d3).setState(harden({ s: 'new' }));
        log(`called`);
        const s = D(devices.d3).getState();
        log(`got ${JSON.stringify(s)}`);
      } else {
        throw new Error(`unknown argv mode '${vatOptions.argv[0]}'`);
      }
    },
  });
}
