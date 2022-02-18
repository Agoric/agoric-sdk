import { Far } from '@endo/marshal';

export const buildRootObject = () => {
  const C = Far('Zoe Invitation payment', { hello: () => {} });
  return Far('root', {
    makeInvitationZoe: async () => C,
  });
};
