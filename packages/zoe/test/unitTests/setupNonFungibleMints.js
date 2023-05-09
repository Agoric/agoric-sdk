import { makeIssuerKit, AmountMath, AssetKind } from '@agoric/ertp';
import { makeZoeForTest } from '../../tools/setup-zoe.js';
import { makeFakeVatAdmin } from '../../tools/fakeVatAdmin.js';

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

  /**
   *
   * @param {string} name
   * @param {string} power
   * @param {string} [desc]
   */
  function createRpgItem(name, power, desc) {
    return harden([{ name, description: desc || name, power }]);
  }
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const zoe = makeZoeForTest(fakeVatAdmin);

  const ccIssuer = ccBundle.issuer;
  const rpgIssuer = rpgBundle.issuer;
  const ccMint = ccBundle.mint;
  const rpgMint = rpgBundle.mint;
  /** @param {SetValue} value */
  const cryptoCats = value => AmountMath.make(allBundles.cc.brand, value);
  /** @param {SetValue} value */
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
    vatAdminState,
  };
};
harden(setupNonFungible);
export { setupNonFungible };
