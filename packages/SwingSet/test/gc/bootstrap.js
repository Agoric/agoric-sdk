import { Far } from '@endo/far';
import { E } from '@endo/eventual-send';

export function buildRootObject() {
  let A = Far('A', { hello() {} });
  let B = Far('B', { hello() {} });
  let target;
  let zoe;

  return Far('root', {
    async bootstrap(vats) {
      target = vats.target;
      zoe = vats.zoe;
    },
    async one() {
      await E(target).two(A, B);
    },
    drop() {
      A = null;
      B = null;
    },

    async makeInvitation0() {
      await E(target).makeInvitationTarget(zoe);
    },
  });
}
