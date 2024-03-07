import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { D, testLog } = vatPowers;
  let stashDevice;
  return makeExo(
    'right',
    M.interface('right', {}, { defaultGuards: 'passable' }),
    {
      async acceptDevice(dev) {
        stashDevice = dev;
      },
      async getAmy() {
        const amy = D(stashDevice).get();
        testLog('vat-right got amy');
        await E(amy).hello('hi amy from vat-right');
      },
    },
  );
}
