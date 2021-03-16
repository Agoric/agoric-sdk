// @ts-check

import { makeIssuerKit, amountMath, MathKind } from '@agoric/ertp';
import { makeZoe } from '../../src/zoeService/zoe';
import fakeVatAdmin from '../../src/contractFacet/fakeVatAdmin';

const setupNonFungible = () => {
  const ccBundle = makeIssuerKit('CryptoCats', MathKind.SET);
  const rpgBundle = makeIssuerKit('MMORPG Items', MathKind.SET);
  const allBundles = { cc: ccBundle, rpg: rpgBundle };
  const mints = new Map();
  const issuers = new Map();
  const brands = new Map();

  for (const k of Object.getOwnPropertyNames(allBundles)) {
    mints.set(k, allBundles[k].mint);
    issuers.set(k, allBundles[k].issuer);
    brands.set(k, allBundles[k].brand);
  }

  function createRpgItem(name, power, desc = undefined) {
    return harden([{ name, description: desc || name, power }]);
  }
  const zoe = makeZoe(fakeVatAdmin);

  const ccIssuer = issuers.get('cc');
  const rpgIssuer = issuers.get('rpg');
  const ccMint = mints.get('cc');
  const rpgMint = mints.get('rpg');
  const cryptoCats = value => amountMath.make(value, allBundles.cc.brand);
  const rpgItems = value => amountMath.make(value, allBundles.rpg.brand);
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
