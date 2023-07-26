import { makeIssuerKit } from '@agoric/ertp';
import { Far } from '@endo/far';

export const buildRootObject = () => {
  return Far('MintRoot', {
    makeIssuerKit,
  });
};
