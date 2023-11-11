import { AmountMath } from '@agoric/ertp';
import binaryVoteCounterBundle from '@agoric/governance/bundles/bundle-binaryVoteCounter.js';
import committeeBundle from '@agoric/governance/bundles/bundle-committee.js';
import contractGovernorBundle from '@agoric/governance/bundles/bundle-contractGovernor.js';
import puppetContractGovernorBundle from '@agoric/governance/bundles/bundle-puppetContractGovernor.js';
import * as utils from '@agoric/vats/src/core/utils.js';
import { makePromiseSpace, makeAgoricNamesAccess } from '@agoric/vats';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { setUpZoeForTest as generalSetUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal';
import {
  makeNotifierFromAsyncIterable,
  observeIteration,
  subscribeEach,
} from '@agoric/notifier';
import { produceDiagnostics } from '@agoric/vats/src/core/basic-behaviors.js';

export { makeMockChainStorageRoot };

/** Common six-decimal places denom */
export const DENOM_UNIT = 1_000_000n;

/**
 * @param {any} t
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
 * @param {() => void} [setJig]
 */
export const setUpZoeForTest = async (setJig = () => {}) =>
  generalSetUpZoeForTest({
    setJig,
    feeIssuerConfig: utils.feeIssuerConfig,
  });
harden(setUpZoeForTest);

/**
 * @param {any} t
 * @param {import('@agoric/time').TimerService} [optTimer]
 */
export const setupBootstrap = async (t, optTimer) => {
  const trace = makeTracer('PromiseSpace', false);
  const space = /** @type {any} */ (makePromiseSpace(trace));
  const { produce, consume } = /**
   * @type {import('../src/proposals/econ-behaviors.js').EconomyBootstrapPowers &
   *     BootstrapPowers}
   */ (space);

  await produceDiagnostics(space);

  const timer = optTimer || buildManualTimer(t.log);
  produce.chainTimerService.resolve(timer);
  produce.chainStorage.resolve(makeMockChainStorageRoot());
  produce.board.resolve(makeFakeBoard());

  const { zoe, feeMintAccess, run } = t.context;
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  const { agoricNames, agoricNamesAdmin, spaces } =
    await makeAgoricNamesAccess();
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
 * Install governance contracts, with a "puppet" governor for use in tests.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {Space['installation']['produce']} produce
 */
export const installPuppetGovernance = (zoe, produce) => {
  produce.committee.resolve(E(zoe).install(committeeBundle));
  produce.contractGovernor.resolve(
    E(zoe).install(puppetContractGovernorBundle),
  );
  // ignored by puppetContractGovernor but expected by something
  produce.binaryVoteCounter.resolve(E(zoe).install(binaryVoteCounterBundle));
};

/**
 * @param {bigint} value
 * @param {{
 *   centralSupply: ERef<
 *     Installation<import('@agoric/vats/src/centralSupply.js').start>
 *   >;
 *   feeMintAccess: ERef<FeeMintAccess>;
 *   zoe: ERef<ZoeService>;
 * }} powers
 * @returns {Promise<Payment<'nat'>>}
 */
export const mintRunPayment = async (
  value,
  { centralSupply, feeMintAccess: feeMintAccessP, zoe },
) => {
  const feeMintAccess = await feeMintAccessP;

  const { creatorFacet: bootstrapSupplier } = await E(zoe).startInstance(
    centralSupply,
    {},
    { bootstrapPaymentValue: value },
    { feeMintAccess },
  );
  return E(bootstrapSupplier).getBootstrapPayment();
};

/**
 * @typedef {import('../src/proposals/econ-behaviors.js').EconomyBootstrapPowers} Space
 * @param {Space} space
 * @param {Record<
 *   keyof Space['installation']['produce'],
 *   Promise<Installation>
 * >} installations
 */
export const produceInstallations = (space, installations) => {
  for (const [key, installation] of Object.entries(installations)) {
    space.installation.produce[key].resolve(installation);
  }
};

export const scale6 = x => BigInt(Math.round(x * 1_000_000));

/** @param {Pick<IssuerKit<'nat'>, 'brand' | 'issuer' | 'mint'>} kit */
export const withAmountUtils = kit => {
  const decimalPlaces = kit.issuer.getDisplayInfo?.()?.decimalPlaces ?? 6;
  return {
    ...kit,
    /** @param {NatValue} v */
    make: v => AmountMath.make(kit.brand, v),
    makeEmpty: () => AmountMath.makeEmpty(kit.brand),
    /**
     * @param {NatValue} n
     * @param {NatValue} [d]
     */
    makeRatio: (n, d) => makeRatio(n, kit.brand, d),
    /** @param {number} n */
    units: n =>
      AmountMath.make(kit.brand, BigInt(Math.round(n * 10 ** decimalPlaces))),
  };
};
/** @typedef {ReturnType<typeof withAmountUtils>} AmountUtils */

/** @param {ERef<StoredSubscription<unknown> | StoredSubscriber<unknown>>} subscription */
export const subscriptionKey = subscription => {
  return E(subscription)
    .getStoreKey()
    .then(storeKey => {
      const [space, unique] = storeKey.storeSubkey.split(':');
      assert(
        space === 'fake',
        'subscriptionKey only works with makeFakeStorageKit',
      );
      return unique;
    });
};

/**
 * @param {ERef<{
 *   getPublicTopics: () => import('@agoric/zoe/src/contractSupport/index.js').TopicsRecord;
 * }>} hasTopics
 * @param {string} subscriberName
 */
export const topicPath = (hasTopics, subscriberName) => {
  return E(hasTopics)
    .getPublicTopics()
    .then(topics => topics[subscriberName])
    .then(t => t.storagePath);
};

/** @type {<T>(subscriber: ERef<Subscriber<T>>) => Promise<T>} */
export const headValue = async subscriber => {
  await eventLoopIteration();
  const record = await E(subscriber).subscribeAfter();
  return record.head.value;
};

/**
 * CAVEAT: the head may lag and you need to explicitly
 * getUpdateSince(lastUpdateCount)
 *
 * @type {<T>(subscription: ERef<Subscription<T>>) => Promise<T>}
 */
export const headValueLegacy = async subscription => {
  await eventLoopIteration();
  const notifier = makeNotifierFromAsyncIterable(subscription);
  const record = await notifier.getUpdateSince();
  // @ts-expect-error bad types for legacy utils
  return record.value.current;
};

/**
 * @param {import('ava').ExecutionContext} t
 * @param {ERef<{
 *   getPublicTopics: () => import('@agoric/zoe/src/contractSupport/index.js').TopicsRecord;
 * }>} hasTopics
 * @param {string} topicName
 * @param {string} path
 * @param {string[]} [dataKeys]
 */
export const assertTopicPathData = async (
  t,
  hasTopics,
  topicName,
  path,
  dataKeys,
) => {
  const topic = await E(hasTopics)
    .getPublicTopics()
    .then(topics => topics[topicName]);
  t.is(await topic?.storagePath, path, 'topic storagePath must match');
  const latest = /** @type {Record<string, unknown>} */ (
    await headValue(topic.subscriber)
  );
  if (dataKeys !== undefined) {
    // TODO consider making this a shape instead
    t.deepEqual(Object.keys(latest), dataKeys, 'keys in topic feed must match');
  }
};

/**
 * Sequence currents from a wallet UpdateRecord publication feed. Note that
 * local state may not reflect the wallet's state if the initial currents are
 * missed.
 *
 * If this proves to be a problem we can add an option to this or a related
 * utility to reset state from RPC.
 *
 * @param {ERef<
 *   Subscriber<
 *     import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord
 *   >
 * >} currents
 * @returns {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord[]}
 *   array that grows as the subscription feeds
 */
export const sequenceCurrents = currents => {
  const sequence = [];

  void observeIteration(subscribeEach(currents), {
    updateState: updateRecord => {
      sequence.push(updateRecord);
    },
  });

  return sequence;
};
