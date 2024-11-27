import { AssetKind } from '@agoric/ertp';
import {
  assertAllDefined,
  deeplyFulfilledObject,
  makeTracer,
} from '@agoric/internal';
import { observeIteration, subscribeEach } from '@agoric/notifier';
import {
  CosmosChainInfoShape,
  DenomDetailShape,
  OrchestrationPowersShape,
  registerChainsAndAssets,
  withOrchestration,
} from '@agoric/orchestration';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { makeZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { depositToSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { E } from '@endo/far';
import { M, objectMap } from '@endo/patterns';
import { prepareAdvancer } from './exos/advancer.js';
import { prepareLiquidityPoolKit } from './exos/liquidity-pool.js';
import { prepareSettler } from './exos/settler.js';
import { prepareStatusManager } from './exos/status-manager.js';
import { prepareTransactionFeedKit } from './exos/transaction-feed.js';
import { defineInertInvitation } from './utils/zoe.js';
import { FastUSDCTermsShape, FeeConfigShape } from './type-guards.js';
import * as flows from './fast-usdc.flows.js';

const trace = makeTracer('FastUsdc');

const STATUS_NODE = 'status';
const FEE_NODE = 'feeConfig';

/**
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {CosmosChainInfo, Denom, DenomDetail, OrchestrationAccount} from '@agoric/orchestration';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {Remote} from '@agoric/internal';
 * @import {Marshaller, StorageNode} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {Zone} from '@agoric/zone';
 * @import {OperatorKit} from './exos/operator-kit.js';
 * @import {CctpTxEvidence, FeeConfig} from './types.js';
 * @import {RepayAmountKWR, RepayPaymentKWR} from './exos/liquidity-pool.js';
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
    chainInfo: M.recordOf(M.string(), CosmosChainInfoShape),
    assetInfo: M.recordOf(M.string(), DenomDetailShape),
  },
};
harden(meta);

/**
 * @param {Remote<StorageNode>} node
 * @param {ERef<Marshaller>} marshaller
 * @param {FeeConfig} feeConfig
 */
const publishFeeConfig = async (node, marshaller, feeConfig) => {
  const feeNode = E(node).makeChildNode(FEE_NODE);
  const value = await E(marshaller).toCapData(feeConfig);
  return E(feeNode).setValue(JSON.stringify(value));
};

/**
 * @param {ZCF<FastUsdcTerms>} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   feeConfig: FeeConfig;
 *   chainInfo: Record<string, CosmosChainInfo>;
 *   assetInfo: Record<Denom, DenomDetail & { brandKey?: string}>;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
export const contract = async (zcf, privateArgs, zone, tools) => {
  assert(tools, 'no tools');
  const terms = zcf.getTerms();
  assert('USDC' in terms.brands, 'no USDC brand');
  assert('usdcDenom' in terms, 'no usdcDenom');

  const { feeConfig, marshaller, storageNode } = privateArgs;
  const { makeRecorderKit } = prepareRecorderKitMakers(
    zone.mapStore('vstorage'),
    marshaller,
  );

  const makeStatusNode = () => E(storageNode).makeChildNode(STATUS_NODE);
  const statusManager = prepareStatusManager(zone, makeStatusNode);

  const { USDC } = terms.brands;
  const { withdrawToSeat } = tools.zoeTools;
  const { baggage, chainHub, orchestrateAll, vowTools } = tools;
  const makeSettler = prepareSettler(zone, {
    statusManager,
    USDC,
    withdrawToSeat,
    feeConfig,
    vowTools: tools.vowTools,
    zcf,
    chainHub,
  });

  const { localTransfer } = makeZoeTools(zcf, vowTools);
  const makeAdvancer = prepareAdvancer(zone, {
    chainHub,
    feeConfig,
    localTransfer,
    usdc: harden({
      brand: terms.brands.USDC,
      denom: terms.usdcDenom,
    }),
    statusManager,
    vowTools,
    zcf,
  });

  const makeFeedKit = prepareTransactionFeedKit(zone, zcf);
  assertAllDefined({ makeFeedKit, makeAdvancer, makeSettler, statusManager });

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

  const { makeLocalAccount } = orchestrateAll(flows, {});

  const creatorFacet = zone.exo('Fast USDC Creator', undefined, {
    /** @type {(operatorId: string) => Promise<Invitation<OperatorKit>>} */
    async makeOperatorInvitation(operatorId) {
      return feedKit.creator.makeOperatorInvitation(operatorId);
    },
    /**
     * @param {{ USDC: Amount<'nat'>}} amounts
     */
    testBorrow(amounts) {
      console.log('🚧🚧 UNTIL: borrow is integrated (#10388) 🚧🚧', amounts);
      const { zcfSeat: tmpAssetManagerSeat } = zcf.makeEmptySeatKit();
      poolKit.borrower.borrow(tmpAssetManagerSeat, amounts);
      return tmpAssetManagerSeat.getCurrentAllocation();
    },
    /**
     *
     * @param {RepayAmountKWR} amounts
     * @param {RepayPaymentKWR} payments
     * @returns {Promise<AmountKeywordRecord>}
     */
    async testRepay(amounts, payments) {
      console.log('🚧🚧 UNTIL: repay is integrated (#10388) 🚧🚧', amounts);
      const { zcfSeat: tmpAssetManagerSeat } = zcf.makeEmptySeatKit();
      await depositToSeat(
        zcf,
        tmpAssetManagerSeat,
        await deeplyFulfilledObject(
          objectMap(payments, pmt => E(terms.issuers.USDC).getAmountOf(pmt)),
        ),
        payments,
      );
      poolKit.repayer.repay(tmpAssetManagerSeat, amounts);
      return tmpAssetManagerSeat.getCurrentAllocation();
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
      return poolKit.public.makeDepositInvitation();
    },
    makeWithdrawInvitation() {
      return poolKit.public.makeWithdrawInvitation();
    },
    getPublicTopics() {
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

  void publishFeeConfig(storageNode, marshaller, feeConfig);

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

  /** Chain, connection, and asset info can only be registered once */
  const firstIncarnationKey = 'firstIncarnationKey';
  if (!baggage.has(firstIncarnationKey)) {
    baggage.init(firstIncarnationKey, true);
    registerChainsAndAssets(
      chainHub,
      terms.brands,
      privateArgs.chainInfo,
      privateArgs.assetInfo,
    );
  }

  const feedKit = zone.makeOnce('Feed Kit', () => makeFeedKit());

  const poolAccountV = zone.makeOnce('PoolAccount', () => makeLocalAccount());
  const settleAccountV = zone.makeOnce('SettleAccount', () =>
    makeLocalAccount(),
  );
  // when() is OK here since this clearly resolves promptly.
  /** @type {HostInterface<OrchestrationAccount<{chainId: 'agoric';}>>[]} */
  const [poolAccount, settlementAccount] = await vowTools.when(
    vowTools.all([poolAccountV, settleAccountV]),
  );

  const [_agoric, _noble, agToNoble] = await vowTools.when(
    chainHub.getChainsAndConnection('agoric', 'noble'),
  );
  const settlerKit = makeSettler({
    repayer: poolKit.repayer,
    sourceChannel: agToNoble.transferChannel.counterPartyChannelId,
    remoteDenom: 'uusdc',
    settlementAccount,
  });

  const advancer = zone.makeOnce('Advancer', () =>
    makeAdvancer({
      borrowerFacet: poolKit.borrower,
      notifyFacet: settlerKit.notify,
      poolAccount,
    }),
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

  await settlerKit.creator.monitorMintingDeposits();

  return harden({ creatorFacet, publicFacet });
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
/** @typedef {typeof start} FastUsdcSF */
