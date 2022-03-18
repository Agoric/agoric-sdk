import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    async bootstrap(vats) {
      const thing = await E(vats.bob).getYourThing();
      await E(vats.bob).isThingYourThing(thing);
    },
  });
}
