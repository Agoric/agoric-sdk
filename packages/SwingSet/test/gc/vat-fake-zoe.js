import { Far } from '@endo/marshal';

export function buildRootObject() {
  const C = Far('Zoe Invitation payment', { hello() {} });
  return Far('root', {
    async makeInvitationZoe() {
      return C;
    },
  });
}
