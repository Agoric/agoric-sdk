import { Fail } from '@endo/errors';
import { Far } from '@endo/far';

export function buildRootObject(vatPowers, vatParameters) {
  const { D, testLog: log } = vatPowers;
  return Far('root', {
    async bootstrap(vats, devices) {
      if (vatParameters.argv[0] === 'write+read') {
        log(`w+r`);
        D(devices.d3).setState(harden({ s: 'new' }));
        log(`called`);
        const s = D(devices.d3).getState();
        log(`got ${JSON.stringify(s)}`);
      } else {
        Fail`unknown argv mode '${vatParameters.argv[0]}'`;
      }
    },
  });
}
