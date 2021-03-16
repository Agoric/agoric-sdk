// @ts-check

import { makeIssuerKit, amountMath, MathKind } from '@agoric/ertp';
import { makeZoe } from '../../src/zoeService/zoe';
import fakeVatAdmin from '../../src/contractFacet/fakeVatAdmin';

const setupMixed = () => {
  const ccBundle = makeIssuerKit('CryptoCats', MathKind.SET);
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
  const cryptoCats = value => amountMath.make(value, allBundles.cc.brand);
  const moola = value => amountMath.make(value, allBundles.moola.brand);

  const zoe = makeZoe(fakeVatAdmin);
  return {
    zoe,
    ccIssuer,
    moolaIssuer,
    ccMint,
    moolaMint,
    cryptoCats,
    moola,
    brands,
  };
};
harden(setupMixed);
export { setupMixed };
