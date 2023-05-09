import { makeIssuerKit, AmountMath, AssetKind } from '@agoric/ertp';
import { makeZoeForTest } from '../../tools/setup-zoe.js';
import { makeFakeVatAdmin } from '../../tools/fakeVatAdmin.js';

const setupMixed = () => {
  const ccBundle = makeIssuerKit('CryptoCats', AssetKind.SET);
  const moolaBundle = makeIssuerKit('moola');
  const allBundles = { cc: ccBundle, moola: moolaBundle };
  const mints = new Map();
  const issuers = new Map();
  const brands = new Map();

  for (const k of Object.getOwnPropertyNames(allBundles)) {
    mints.set(k, allBundles[k].mint);
    issuers.set(k, allBundles[k].issuer);
    brands.set(k, allBundles[k].brand);
  }

  const ccIssuer = issuers.get('cc');
  const moolaIssuer = issuers.get('moola');
  const ccMint = mints.get('cc');
  const moolaMint = mints.get('moola');
  const cryptoCats = value => AmountMath.make(allBundles.cc.brand, value);
  const moola = value => AmountMath.make(allBundles.moola.brand, value);

  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const zoe = makeZoeForTest(fakeVatAdmin);
  return {
    zoe,
    ccIssuer,
    moolaIssuer,
    ccMint,
    moolaMint,
    cryptoCats,
    moola,
    brands,
    vatAdminState,
  };
};
harden(setupMixed);
export { setupMixed };
