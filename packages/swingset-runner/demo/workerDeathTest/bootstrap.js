import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  console.log(`bootstrap vat initializing`);
  return Far('root', {
    async bootstrap(vats) {
      const howMuch = 100_000_000;
      console.log(`bootstrap vat invokes busy vat for ${howMuch} steps`);
      await E(vats.busy).doStuff(howMuch);
      await E(vats.idle).doNothing();
    },
  });
}
