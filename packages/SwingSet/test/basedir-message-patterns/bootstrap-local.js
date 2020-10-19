import { E } from '@agoric/eventual-send';

export function buildRootObject(_vatPowers, vatParameters) {
  return harden({
    async bootstrap(vats, _devices) {
      const b = await E(vats.b).init();
      await E(vats.a).init(b.bob, b.bert);

      const which = vatParameters.argv[0];
      await E(vats.a).run(which);
    },
  });
}
