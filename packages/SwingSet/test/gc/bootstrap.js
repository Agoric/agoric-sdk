import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  let A = Far('A', { hello() {} });
  let B = Far('B', { hello() {} });
  let target;

  return Far('root', {
    async bootstrap(vats) {
      target = vats.target;
    },
    async one() {
      await E(target).two(A, B);
    },
    drop() {
      A = null;
      B = null;
    },
  });
}
