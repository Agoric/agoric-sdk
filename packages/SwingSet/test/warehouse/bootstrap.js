import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

export function buildRootObject() {
  return Far('root', {
    bootstrap(vats, _devices) {
      const done = Promise.all([
        E(vats.target).append(1),
        E(vats.target2).append(2),
        E(vats.target3).append(3),
        E(vats.target4).append(4),
      ]);
      return done;
    },
  });
}
