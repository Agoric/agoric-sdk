/* global harden */
import { E } from '@agoric/eventual-send';

export function buildRootObject(_vatPowers) {
  return harden({
    async bootstrap(argv, vats, _devices) {
      const which = argv[0];
      const b = await E(vats.b).init();
      // eslint-disable-next-line no-unused-vars
      const a = await E(vats.a).init(b.bob, b.bert);
      await E(vats.a).run(which);
    },
  });
}
