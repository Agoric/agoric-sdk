// @ts-check
/* global setImmediate */

import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import bundleSource from '@endo/bundle-source';
import { makeLoopback } from '@endo/captp';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { governanceBundles, economyBundles } from '../src/importedBundles.js';

/**
 *
 * @param {VaultId} vaultId
 * @param {Amount} initDebt
 * @param {Amount} initCollateral
 * @returns {InnerVault & {setDebt: (Amount) => void}}
 */
export const makeFakeInnerVault = (
  vaultId,
  initDebt,
  initCollateral = AmountMath.make(initDebt.brand, 100n),
) => {
  let debt = initDebt;
  let collateral = initCollateral;
  const vault = Far('Vault', {
    getCollateralAmount: () => collateral,
    getNormalizedDebt: () => debt,
    getCurrentDebt: () => debt,
    setDebt: newDebt => (debt = newDebt),
    setCollateral: newCollateral => (collateral = newCollateral),
    getIdInManager: () => vaultId,
    liquidate: () => {},
  });
  return vault;
};

/**
 *
 * @param {string} sourceRoot
 * @returns {Promise<SourceBundle>}
 */
export const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const path = new URL(url).pathname;
  const contractBundle = await bundleSource(path);
  console.log(`makeBundle ${sourceRoot}`);
  return contractBundle;
};
harden(makeBundle);

// Some notifier updates aren't propagating sufficiently quickly for
// the tests. This invocation waits for all promises that can fire to
// have all their callbacks run
export const waitForPromisesToSettle = async () =>
  new Promise(resolve => setImmediate(resolve));
harden(waitForPromisesToSettle);

/**
 *
 * @param setJig
 * @returns Returns promises for `zoe` and the `feeMintAccess`
 */
export const setUpZoeForTest = (setJig = () => {}) => {
  const { makeFar } = makeLoopback('zoeTest');

  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(setJig).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};
harden(setUpZoeForTest);

export const setupBootstrap = (t, optTimer = undefined) => {
  const space = /** @type {any} */ (makePromiseSpace(t.log));
  const { produce, consume } = /** @type {EconomyBootstrapPowers} */ (space);

  const timer = optTimer || buildManualTimer(t.log);
  produce.chainTimerService.resolve(timer);

  const {
    zoe,
    feeMintAccess,
    runKit: { brand: runBrand, issuer: runIssuer },
  } = t.context;
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  const { brand, issuer } = spaces;
  brand.produce.RUN.resolve(runBrand);
  issuer.produce.RUN.resolve(runIssuer);

  produce.governanceBundles.resolve(governanceBundles);
  produce.centralSupplyBundle.resolve(economyBundles.centralSupply);

  return { produce, consume, ...spaces };
};
