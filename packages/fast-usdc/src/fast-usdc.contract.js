import { AssetKind } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { observeIteration, subscribeEach } from '@agoric/notifier';
import {
  OrchestrationPowersShape,
  withOrchestration,
} from '@agoric/orchestration';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { M } from '@endo/patterns';
import { prepareAdvancer } from './exos/advancer.js';
import { prepareLiquidityPoolKit } from './exos/liquidity-pool.js';
import { prepareSettler } from './exos/settler.js';
import { prepareStatusManager } from './exos/status-manager.js';
import { prepareTransactionFeedKit } from './exos/transaction-feed.js';
import { defineInertInvitation } from './utils/zoe.js';
import { FastUSDCTermsShape, FeeConfigShape } from './type-guards.js';

const trace = makeTracer('FastUsdc');

/**
 * @import {Denom} from '@agoric/orchestration';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {Zone} from '@agoric/zone';
 * @import {OperatorKit} from './exos/operator-kit.js';
 * @import {CctpTxEvidence, FeeConfig} from './types.js';
 */

/**
 * @typedef {{
 *   usdcDenom: Denom;
 * }} FastUsdcTerms
 */

/** @type {ContractMeta<typeof start>} */
export const meta = {
  // @ts-expect-error TypedPattern not recognized as record
  customTermsShape: FastUSDCTermsShape,
  privateArgsShape: {
    // @ts-expect-error TypedPattern not recognized as record
    ...OrchestrationPowersShape,
    feeConfig: FeeConfigShape,
    marshaller: M.remotable(),
  },
};
harden(meta);

/**
 * @param {ZCF<FastUsdcTerms>} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   feeConfig: FeeConfig;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
export const contract = async (zcf, privateArgs, zone, tools) => {
  assert(tools, 'no tools');
  const terms = zcf.getTerms();
  assert('USDC' in terms.brands, 'no USDC brand');
  assert('usdcDenom' in terms, 'no usdcDenom');
  const { feeConfig, marshaller } = privateArgs;
  const { makeRecorderKit } = prepareRecorderKitMakers(
    zone.mapStore('vstorage'),
    marshaller,
  );
  const statusManager = prepareStatusManager(zone);
  const makeSettler = prepareSettler(zone, { statusManager });
  const { chainHub, vowTools } = tools;
  const makeAdvancer = prepareAdvancer(zone, {
    chainHub,
    feeConfig,
    log: trace,
    usdc: harden({
      brand: terms.brands.USDC,
      denom: terms.usdcDenom,
    }),
    statusManager,
    vowTools,
  });
  const makeFeedKit = prepareTransactionFeedKit(zone, zcf);
  assertAllDefined({ makeFeedKit, makeAdvancer, makeSettler, statusManager });
  const feedKit = makeFeedKit();
  const advancer = makeAdvancer(
    // @ts-expect-error FIXME
    {},
  );
  // Connect evidence stream to advancer
  void observeIteration(subscribeEach(feedKit.public.getEvidenceSubscriber()), {
    updateState(evidence) {
      try {
        void advancer.handleTransactionEvent(evidence);
      } catch (err) {
        trace('🚨 Error handling transaction event', err);
      }
    },
  });
  const makeLiquidityPoolKit = prepareLiquidityPoolKit(
    zone,
    zcf,
    terms.brands.USDC,
    { makeRecorderKit },
  );

  const makeTestInvitation = defineInertInvitation(
    zcf,
    'test of forcing evidence',
  );

  const creatorFacet = zone.exo('Fast USDC Creator', undefined, {
    /** @type {(operatorId: string) => Promise<Invitation<OperatorKit>>} */
    async makeOperatorInvitation(operatorId) {
      return feedKit.creator.makeOperatorInvitation(operatorId);
    },
    simulateFeesFromAdvance(amount, payment) {
      console.log('🚧🚧 UNTIL: advance fees are implemented 🚧🚧');
      // eslint-disable-next-line no-use-before-define
      return poolKit.feeSink.receive(amount, payment);
    },
  });

  const publicFacet = zone.exo('Fast USDC Public', undefined, {
    // XXX to be removed before production
    /**
     * NB: Any caller with access to this invitation maker has the ability to
     * force handling of evidence.
     *
     * Provide an API call in the form of an invitation maker, so that the
     * capability is available in the smart-wallet bridge during UI testing.
     *
     * @param {CctpTxEvidence} evidence
     */
    makeTestPushInvitation(evidence) {
      void advancer.handleTransactionEvent(evidence);
      return makeTestInvitation();
    },
    makeDepositInvitation() {
      // eslint-disable-next-line no-use-before-define
      return poolKit.public.makeDepositInvitation();
    },
    makeWithdrawInvitation() {
      // eslint-disable-next-line no-use-before-define
      return poolKit.public.makeWithdrawInvitation();
    },
    getPublicTopics() {
      // eslint-disable-next-line no-use-before-define
      return poolKit.public.getPublicTopics();
    },
  });

  // ^^^ Define all kinds above this line. Keep remote calls below. vvv

  // NOTE: Using a ZCFMint is helpful for the usual reasons (
  // synchronous mint/burn, keeping assets out of contract vats, ...).
  // And there's just one pool, which suggests building it with zone.exo().
  //
  // But zone.exo() defines a kind and
  // all kinds have to be defined before any remote calls,
  // such as the one to the zoe vat as part of making a ZCFMint.
  //
  // So we use zone.exoClassKit above to define the liquidity pool kind
  // and pass the shareMint into the maker / init function.

  const shareMint = await provideSingleton(
    zone.mapStore('mint'),
    'PoolShare',
    () =>
      zcf.makeZCFMint('PoolShares', AssetKind.NAT, {
        decimalPlaces: 6,
      }),
  );

  const poolKit = zone.makeOnce('Liquidity Pool kit', () =>
    makeLiquidityPoolKit(shareMint, privateArgs.storageNode),
  );

  return harden({ creatorFacet, publicFacet });
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
/** @typedef {typeof start} FastUsdcSF */
