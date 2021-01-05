// @ts-check

import { E } from '@agoric/eventual-send';

/** @type {MakeSaveIssuerHelper} */
export const makeSaveIssuer = (
  walletAdmin,
  saveLocalAmountMaths,
  issuerManager,
) => {
  /** @type {SaveIssuerHelper} */
  const saveIssuer = async (issuerP, brandPetname, pursePetname) => {
    const issuer = await Promise.resolve(issuerP);
    await E(issuerManager).add(brandPetname, issuer);
    const emptyPurseMadeP = E(walletAdmin).makeEmptyPurse(
      brandPetname,
      pursePetname,
    );
    const localAmountMathSavedP = saveLocalAmountMaths([brandPetname]);

    return Promise.all([emptyPurseMadeP, localAmountMathSavedP]);
  };

  return saveIssuer;
};
