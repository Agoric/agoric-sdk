// @ts-check
/* global setImmediate */

import { E } from '@endo/far';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { makeLoopback } from '@endo/captp';

import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import committeeBundle from '@agoric/governance/bundles/bundle-committee.js';
import contractGovernorBundle from '@agoric/governance/bundles/bundle-contractGovernor.js';
import binaryVoteCounterBundle from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';

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
  // @ts-expect-error cast
  return vault;
};

/**
 * @param {*} t
 * @param {string} sourceRoot
 * @param {string} bundleName
 * @returns {Promise<SourceBundle>}
 */
export const provideBundle = (t, sourceRoot, bundleName) => {
  assert(
    t.context && t.context.bundleCache,
    'must set t.context.bundleCache in test.before()',
  );
  const { bundleCache } = t.context;
  return bundleCache.load(sourceRoot, bundleName);
};
harden(provideBundle);

// Some notifier updates aren't propagating sufficiently quickly for
// the tests. This invocation waits for all promises that can fire to
// have all their callbacks run
export const waitForPromisesToSettle = async () =>
  new Promise(resolve => setImmediate(resolve));
harden(waitForPromisesToSettle);

/**
 * Returns promises for `zoe` and the `feeMintAccess`.
 *
 * @param {() => void} setJig
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

  return { produce, consume, ...spaces };
};

export const installGovernance = (zoe, produce) => {
  produce.committee.resolve(E(zoe).install(committeeBundle));
  produce.contractGovernor.resolve(E(zoe).install(contractGovernorBundle));
  produce.binaryVoteCounter.resolve(E(zoe).install(binaryVoteCounterBundle));
};
