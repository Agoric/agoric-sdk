// @ts-check

import { E } from '@endo/eventual-send';

/** @type {MakeSaveIssuerHelper} */
export const makeSaveIssuer = (walletAdmin, issuerManager) => {
  /** @type {SaveIssuerHelper} */
  const saveIssuer = async (issuerP, brandPetname, pursePetname) => {
    console.log(`-- Installing issuer for: ${brandPetname}`);

    const issuer = await Promise.resolve(issuerP);
    await E(issuerManager).add(brandPetname, issuer);
    const emptyPurseMade = await E(walletAdmin).makeEmptyPurse(
      brandPetname,
      pursePetname,
    );

    console.log(`-- Installed issuer for: ${brandPetname}`);
    return emptyPurseMade;
  };

  return saveIssuer;
};
