import { Far, E } from '@endo/far';

export function buildRootObject() {
  return Far('root', {
    async two(A, B) {
      // A=ko26 B=ko27
      await E(A).hello(B);
    },

    makeInvitationTarget(zoe) {
      return E(zoe).makeInvitationZoe();
    },
  });
}
