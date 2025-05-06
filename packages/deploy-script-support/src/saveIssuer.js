// @ts-check
import { E } from '@endo/far';

/** @import {Petname} from '@agoric/deploy-script-support/src/externalTypes.js' */

/**
 * @param {ERef<any>} walletAdmin - an internal type of the
 * wallet, not defined here
 * @param {ERef<import('./startInstance.js').IssuerManager>} issuerManager
 */
export const makeSaveIssuer = (walletAdmin, issuerManager) => {
  /**
   * @param {ERef<Issuer>} issuerP
   * @param {Petname} brandPetname
   * @param {Petname} pursePetname
   * @returns {Promise<Petname>}
   */
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
