// @ts-check

import { E } from '@agoric/eventual-send';

/** @type {MakeSaveIssuerHelper} */
export const makeSaveIssuer = (walletAdmin, issuerManager) => {
  /** @type {SaveIssuerHelper} */
  const saveIssuer = async (issuerP, brandPetname, pursePetname) => {
    console.log(`-- Installing issuer for: ${brandPetname}`);

    const issuer = await Promise.resolve(issuerP);
    await E(issuerManager).add(brandPetname, issuer);
    const emptyPurseMadeP = E(walletAdmin).makeEmptyPurse(
      brandPetname,
      pursePetname,
    );

    const result = await emptyPurseMadeP;
    console.log(`-- Installed issuer for: ${brandPetname}`);
    return result;
  };

  return saveIssuer;
};
