// @ts-check

import { makeIssuerKit, AmountMath, AssetKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { makeZoeKit } from '../../src/zoeService/zoe.js';
import fakeVatAdmin from '../../tools/fakeVatAdmin.js';

const setupNonFungible = () => {
  const ccBundle = makeIssuerKit('CryptoCats', AssetKind.SET);
  const rpgBundle = makeIssuerKit('MMORPG Items', AssetKind.SET);
  const allBundles = { cc: ccBundle, rpg: rpgBundle };
  /** @type {Map<string, Mint>} */
  const mints = new Map();
  /** @type {Map<string, Issuer>} */
  const issuers = new Map();
  /** @type {Map<string, Brand>} */
  const brands = new Map();

  for (const k of Object.getOwnPropertyNames(allBundles)) {
    mints.set(k, allBundles[k].mint);
    issuers.set(k, allBundles[k].issuer);
    brands.set(k, allBundles[k].brand);
  }

  function createRpgItem(name, power, desc = undefined) {
    return harden([{ name, description: desc || name, power }]);
  }
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  const ccIssuer = ccBundle.issuer;
  const rpgIssuer = rpgBundle.issuer;
  const ccMint = ccBundle.mint;
  const rpgMint = rpgBundle.mint;
  /** @param {Value} value */
  const cryptoCats = value => AmountMath.make(allBundles.cc.brand, value);
  /** @param {Value} value */
  const rpgItems = value => AmountMath.make(allBundles.rpg.brand, value);
  return {
    ccIssuer,
    rpgIssuer,
    ccMint,
    rpgMint,
    cryptoCats,
    rpgItems,
    brands,
    createRpgItem,
    zoe,
  };
};
harden(setupNonFungible);
export { setupNonFungible };
