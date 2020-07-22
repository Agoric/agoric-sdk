import makeIssuerKit from '@agoric/ertp';

const setupNonFungible = () => {
  const ccBundle = makeIssuerKit('CryptoCats', 'strSet');
  const rpgBundle = makeIssuerKit('MMORPG Items', 'set');
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

  function createRpgItem(name, power, desc = undefined) {
    return harden([{ name, description: desc || name, power }]);
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
    createRpgItem,
  };
};
harden(setupNonFungible);
export { setupNonFungible };
