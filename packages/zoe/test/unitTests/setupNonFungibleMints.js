import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';

const setupNonFungible = () => {
  const ccBundle = produceIssuer('CryptoCats', 'strSet');
  const rpgBundle = produceIssuer('MMORPG Items', 'strSet');
  const allBundles = { cc: ccBundle, rpg: rpgBundle };
  const mints = new Map();
  const issuers = new Map();
  const amountMaths = new Map();
  const brands = new Map();

  for (const k of Object.getOwnPropertyNames(allBundles)) {
    mints.set(k, allBundles[k].mint);
    issuers.set(k, allBundles[k].issuer);
    amountMaths.set(k, allBundles[k].amountMath);
    brands.set(k, allBundles[k].brand);
  }

  const ccIssuer = issuers.get('cc');
  const rpgIssuer = issuers.get('rpg');
  const ccMint = mints.get('cc');
  const rpgMint = mints.get('rpg');
  const cryptoCats = allBundles.cc.amountMath.make;
  const rpgItems = allBundles.rpg.amountMath.make;
  return {
    ccIssuer,
    rpgIssuer,
    ccMint,
    rpgMint,
    cryptoCats,
    rpgItems,
    amountMaths,
    brands,
  };
};
harden(setupNonFungible);
export { setupNonFungible };
