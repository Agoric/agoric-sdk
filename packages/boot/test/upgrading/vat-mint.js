import { makeIssuerKit } from '@agoric/ertp';
import { Far } from '@endo/far';

export const buildRootObject = () => {
  return makeExo(
    'MintRoot',
    M.interface('MintRoot', {}, { defaultGuards: 'passable' }),
    {
      makeIssuerKit,
    },
  );
};
