import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = (_vatPowers, vatParameters) =>
  Far('root', {
    bootstrap: async (vats, _devices) => {
      // initialize B, to get the object that we'll export to A
      const { bob, bert } = await E(vats.b).init();
      // initialize C, to get the object that we'll export to A
      const { carol } = await E(vats.c).init();

      // initialize A, and give it objects from B and C
      await E(vats.a).init(bob, bert, carol);

      const which = vatParameters.argv[0];
      await E(vats.a).run(which);
    },
  });
