import { Far } from '@endo/far';
import { makeIssuerKit } from '@agoric/ertp';

export const buildRootObject = () => {
  return Far('MintRoot', {
    makeIssuerKit,
  });
};
