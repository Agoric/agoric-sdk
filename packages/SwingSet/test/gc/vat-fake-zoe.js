import { Far } from '@endo/far';

export function buildRootObject() {
  const C = Far('Zoe Invitation payment', { hello() {} });
  return Far('root', {
    async makeInvitationZoe() {
      return C;
    },
  });
}
