import { Far } from '@endo/marshal';
import { E } from '@agoric/eventual-send';

export const buildRootObject = () => {
  let A = Far('A', { hello: () => {} });
  let B = Far('B', { hello: () => {} });
  let target;
  let zoe;

  return Far('root', {
    bootstrap: async vats => {
      target = vats.target;
      zoe = vats.zoe;
    },
    one: async () => {
      await E(target).two(A, B);
    },
    drop: () => {
      A = null;
      B = null;
    },

    makeInvitation0: async () => {
      await E(target).makeInvitationTarget(zoe);
    },
  });
};
