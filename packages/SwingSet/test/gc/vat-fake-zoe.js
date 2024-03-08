import { Far } from '@endo/far';

export function buildRootObject() {
  const C = makeExo(
    'Zoe Invitation payment',
    M.interface('Zoe Invitation payment', {}, { defaultGuards: 'passable' }),
    { hello() {} },
  );
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async makeInvitationZoe() {
        return C;
      },
    },
  );
}
