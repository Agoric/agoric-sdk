// @ts-check

import { AmountMath } from '@agoric/ertp';
import binaryVoteCounterBundle from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';
import committeeBundle from '@agoric/governance/bundles/bundle-committee.js';
import contractGovernorBundle from '@agoric/governance/bundles/bundle-contractGovernor.js';
import * as utils from '@agoric/vats/src/core/utils.js';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { makeChainStorageRoot } from '@agoric/vats/src/lib-chainStorage.js';
import { Stable } from '@agoric/vats/src/tokens.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeLoopback } from '@endo/captp';
import { E } from '@endo/far';
import { makeTracer } from '../src/makeTracer.js';

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

/**
 * Returns promises for `zoe` and the `feeMintAccess`.
 *
 * @param {() => void} setJig
 * @returns {import('./amm/vpool-xyk-amm/setup.js').FarZoeKit}
 */
export const setUpZoeForTest = (setJig = () => {}) => {
  const { makeFar } = makeLoopback('zoeTest');

  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(setJig).admin,
    undefined,
    {
      name: Stable.symbol,
      assetKind: Stable.assetKind,
      displayInfo: Stable.displayInfo,
    },
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

export const mockChainStorageRoot = () => {
  const toStorage = v => v;
  return makeChainStorageRoot(toStorage, 'swingset', 'mockChainStorageRoot');
};

/**
 *
 * @param {*} t
 * @param {TimerService} [optTimer]
 */
export const setupBootstrap = (t, optTimer) => {
  const trace = makeTracer('PromiseSpace', false);
  const space = /** @type {any} */ (makePromiseSpace(trace));
  const { produce, consume } =
    /** @type { import('../src/proposals/econ-behaviors.js').EconomyBootstrapPowers & BootstrapPowers } */ (
      space
    );

  const timer = optTimer || buildManualTimer(t.log);
  produce.chainTimerService.resolve(timer);
  produce.chainStorage.resolve(mockChainStorageRoot());
  produce.board.resolve(makeBoard());

  const { zoe, feeMintAccess, run } = t.context;
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  const { agoricNames, agoricNamesAdmin, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  const { brand, issuer } = spaces;
  brand.produce.IST.resolve(run.brand);
  issuer.produce.IST.resolve(run.issuer);

  return { produce, consume, modules: { utils: { ...utils } }, ...spaces };
};

export const installGovernance = (zoe, produce) => {
  produce.committee.resolve(E(zoe).install(committeeBundle));
  produce.contractGovernor.resolve(E(zoe).install(contractGovernorBundle));
  produce.binaryVoteCounter.resolve(E(zoe).install(binaryVoteCounterBundle));
};

/**
 * Economic Committee of one.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<CommitteeElectorateCreatorFacet>} electorateCreator
 * @param {ERef<GovernedContractFacetAccess<{},{}>>} runStakeGovernorCreatorFacet
 * @param {Installation} counter
 */
export const makeVoterTool = async (
  zoe,
  electorateCreator,
  runStakeGovernorCreatorFacet,
  counter,
) => {
  const [invitation] = await E(electorateCreator).getVoterInvitations();
  await runStakeGovernorCreatorFacet;
  const seat = E(zoe).offer(invitation);
  const voteFacet = E(seat).getOfferResult();
  return harden({
    changeParam: async (paramsSpec, deadline) => {
      /** @type { ContractGovernanceVoteResult } */
      const { details, instance } = await E(
        runStakeGovernorCreatorFacet,
      ).voteOnParamChanges(counter, deadline, paramsSpec);
      const { questionHandle, positions } = await details;
      const cast = E(voteFacet).castBallotFor(questionHandle, [positions[0]]);
      const count = E(zoe).getPublicFacet(instance);
      const outcome = E(count).getOutcome();
      return { cast, outcome };
    },
  });
};

/**
 * @param {bigint} value
 * @param {{
 *   centralSupply: ERef<Installation>,
 *   feeMintAccess: ERef<FeeMintAccess>,
 *   zoe: ERef<ZoeService>,
 * }} powers
 * @returns {Promise<Payment>}
 */
export const mintRunPayment = async (
  value,
  { centralSupply, feeMintAccess: feeMintAccessP, zoe },
) => {
  const feeMintAccess = await feeMintAccessP;

  const { creatorFacet: ammSupplier } = await E(zoe).startInstance(
    centralSupply,
    {},
    { bootstrapPaymentValue: value },
    { feeMintAccess },
  );
  return E(ammSupplier).getBootstrapPayment();
};

/**
 * @typedef {import('../src/proposals/econ-behaviors.js').EconomyBootstrapPowers} Space
 *
 * @param {Space} space
 * @param {Record<keyof Space['installation']['produce'], Promise<Installation>>} installations
 */
export const produceInstallations = (space, installations) => {
  for (const [key, installation] of Object.entries(installations)) {
    space.installation.produce[key].resolve(installation);
  }
};

/**
 * @param {object} kit
 * @param {Brand<'nat'>} kit.brand
 * @param {Issuer<'nat'>} [kit.issuer]
 * @param {Mint<'nat'>} [kit.mint]
 */
export const withAmountUtils = kit => {
  return {
    ...kit,
    /**
     * @param {NatValue} v
     */
    make: v => AmountMath.make(kit.brand, v),
    makeEmpty: () => AmountMath.makeEmpty(kit.brand),
    /**
     * @param {NatValue} n
     * @param {NatValue} [d]
     */
    makeRatio: (n, d) => makeRatio(n, kit.brand, d),
  };
};
/** @typedef {ReturnType<typeof withAmountUtils>} AmountUtils */

/**
 *
 * @param {Promise<StoredSubscription<unknown>> | StoredSubscriber<unknown>} subscription
 */
export const subscriptionKey = subscription => {
  return E(subscription)
    .getStoreKey()
    .then(storeKey => storeKey.key);
};
