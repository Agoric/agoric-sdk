import { E } from '@endo/eventual-send';
import { Far } from '@endo/far';

export function buildRootObject(_vatPowers, vatParameters) {
  return Far('root', {
    async bootstrap(vats) {
      const mode = vatParameters.argv[0];
      const thing = await E(vats.bob).retain(mode);
      await E(vats.bob).testForRetention(thing);
    },
  });
}
