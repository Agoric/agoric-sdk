import { Far } from '@endo/marshal';
import { E } from '@agoric/eventual-send';

export const buildRootObject = () =>
  Far('root', {
    two: async (A, B) => {
      // A=ko26 B=ko27
      await E(A).hello(B);
    },

    makeInvitationTarget: zoe => E(zoe).makeInvitationZoe(),
  });
