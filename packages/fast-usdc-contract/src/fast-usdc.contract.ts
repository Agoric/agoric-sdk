import { AssetKind, type Amount } from '@agoric/ertp';
import {
  FastUSDCTermsShape,
  FeeConfigShape,
  CosmosChainInfoShapeV1,
} from '@agoric/fast-usdc/src/type-guards.js';
import { makeTracer } from '@agoric/internal';
import { observeIteration, subscribeEach } from '@agoric/notifier';
import {
  DenomDetailShape,
  DenomShape,
  type IBCConnectionInfo,
  OrchestrationPowersShape,
  registerChainsAndAssets,
  withOrchestration,
  type OrchestrationAccount,
  type OrchestrationPowers,
  type OrchestrationTools,
  type Denom,
  type DenomDetail,
  type NobleMethods,
  type OrchestrationAccountCommon,
  type LocalAccountMethods,
} from '@agoric/orchestration';
import { makeZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { Fail } from '@endo/errors';
import { E, type ERef } from '@endo/far';
import { M } from '@endo/patterns';

import type { HostInterface } from '@agoric/async-flow';
import type {
  ChainHubChainInfo,
  ContractRecord,
  FastUsdcTerms,
  FeeConfig,
} from '@agoric/fast-usdc/src/types.js';
import type { Remote } from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import type { Zone } from '@agoric/zone';
import type { ContractMeta, Invitation, ZCF } from '@agoric/zoe';
import { prepareAdvancer } from './exos/advancer.ts';
import { prepareLiquidityPoolKit } from './exos/liquidity-pool.ts';
import { prepareSettler } from './exos/settler.ts';
import { prepareStatusManager } from './exos/status-manager.ts';
import type { OperatorOfferResult } from './exos/transaction-feed.ts';
import { prepareTransactionFeedKit } from './exos/transaction-feed.ts';
import * as flows from './fast-usdc.flows.ts';

const trace = makeTracer('FastUsdc');

trace('starting');

const TXNS_NODE = 'txns';
const FEE_NODE = 'feeConfig';
const ADDRESSES_BAGGAGE_KEY = 'addresses';

export const meta = {
  customTermsShape: FastUSDCTermsShape,
  privateArgsShape: {
    // @ts-expect-error TypedPattern not recognized as record
    ...OrchestrationPowersShape,
    assetInfo: M.arrayOf([DenomShape, DenomDetailShape]),
    chainInfo: M.recordOf(M.string(), CosmosChainInfoShapeV1),
    feeConfig: FeeConfigShape,
    marshaller: M.remotable(),
    poolMetricsNode: M.remotable(),
  },
} as ContractMeta<typeof start>;
harden(meta);

const publishFeeConfig = (
  node: Remote<StorageNode>,
  marshaller: ERef<Marshaller>,
  feeConfig: FeeConfig,
) => {
  const feeNode = E(node).makeChildNode(FEE_NODE);
  void E.when(E(marshaller).toCapData(feeConfig), value =>
    E(feeNode).setValue(JSON.stringify(value)),
  );
};

const publishAddresses = (
  contractNode: Remote<StorageNode>,
  addresses: ContractRecord,
) => {
  return E(contractNode).setValue(JSON.stringify(addresses));
};

export const contract = async (
  zcf: ZCF<FastUsdcTerms>,
  privateArgs: OrchestrationPowers & {
    assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
    chainInfo: Record<string, ChainHubChainInfo>;
    feeConfig: FeeConfig;
    marshaller: Marshaller;
    storageNode: StorageNode;
    poolMetricsNode: Remote<StorageNode>;
  },
  zone: Zone,
  tools: OrchestrationTools,
) => {
  trace('contract');
  console.log('FAST USDC contract start');

  assert(tools, 'no tools');
  const terms = zcf.getTerms();
  assert('USDC' in terms.brands, 'no USDC brand');
  assert('usdcDenom' in terms, 'no usdcDenom');

  const { feeConfig, marshaller, storageNode } = privateArgs;
  const { makeRecorderKit } = prepareRecorderKitMakers(
    zone.mapStore('vstorage'),
    marshaller,
  );

  const statusManager = prepareStatusManager(
    zone,
    E(storageNode).makeChildNode(TXNS_NODE),
    { marshaller },
  );

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

  const zoeTools = makeZoeTools(zcf, vowTools);
  const makeAdvancer = prepareAdvancer(zone, {
    baggage,
    chainHub,
    feeConfig,
    usdc: harden({
      brand: terms.brands.USDC,
      denom: terms.usdcDenom,
    }),
    statusManager,
    vowTools,
    zcf,
    zoeTools,
  });

  const makeFeedKit = prepareTransactionFeedKit(zone, zcf);

  const makeLiquidityPoolKit = prepareLiquidityPoolKit(
    zone,
    zcf,
    terms.brands.USDC,
    { makeRecorderKit },
  );

  const { makeLocalAccount, makeNobleAccount } = orchestrateAll(flows, {});

  const creatorFacet = zone.exo('Fast USDC Creator', undefined, {
    async makeOperatorInvitation(
      operatorId: string,
    ): Promise<Invitation<OperatorOfferResult>> {
      return feedKit.creator.makeOperatorInvitation(operatorId);
    },
    removeOperator(operatorId: string): void {
      return feedKit.creator.removeOperator(operatorId);
    },
    async getContractFeeBalance(): Promise<Amount<'nat'>> {
      return poolKit.feeRecipient.getContractFeeBalance();
    },
    async makeWithdrawFeesInvitation(): Promise<Invitation<unknown>> {
      return poolKit.feeRecipient.makeWithdrawFeesInvitation();
    },
    async connectToNoble(
      agoricChainId?: string,
      nobleChainId?: string,
      agoricToNoble?: IBCConnectionInfo,
    ) {
      const shouldUpdate = agoricChainId && nobleChainId && agoricToNoble;
      if (shouldUpdate) {
        trace('connectToNoble', agoricChainId, nobleChainId, agoricToNoble);
        chainHub.updateConnection(agoricChainId, nobleChainId, agoricToNoble);
      }
      const nobleICALabel = `NobleICA-${(shouldUpdate ? agoricToNoble : agToNoble).counterparty.connection_id}`;
      trace('NobleICA', nobleICALabel);
      // v1 has `NobleAccount` which we don't expect to ever settle.
      // v2 has `NobleICA-connection-38` which will be settled/cached when v3 starts
      const nobleAccountV = zone.makeOnce(nobleICALabel, () =>
        makeNobleAccount(),
      );

      type NobleOrchestrationAccount = HostInterface<
        NobleMethods & OrchestrationAccountCommon & LocalAccountMethods
      >;
      return vowTools.when(
        nobleAccountV,
        // @ts-expect-error Vow type confusion
        (nobleAccount: NobleOrchestrationAccount) => {
          trace('nobleAccount', nobleAccount);
          return vowTools.when(
            E(nobleAccount).getAddress(),
            intermediateRecipient => {
              trace('intermediateRecipient', intermediateRecipient);
              advancer.setIntermediateAccount(
                nobleAccount,
                intermediateRecipient,
              );
              settlerKit.creator.setIntermediateRecipient(
                intermediateRecipient,
              );
              return intermediateRecipient;
            },
          );
        },
      );
    },
    async publishAddresses() {
      !baggage.has(ADDRESSES_BAGGAGE_KEY) || Fail`Addresses already published`;
      const [poolAccountAddress] = await vowTools.when(
        vowTools.all([E(poolAccount).getAddress()]),
      );
      const addresses = harden({
        poolAccount: poolAccountAddress.value,
        settlementAccount: settlementAddress.value,
      });
      baggage.init(ADDRESSES_BAGGAGE_KEY, addresses);
      await publishAddresses(storageNode, addresses);
      return addresses;
    },
    deleteCompletedTxs() {
      return statusManager.deleteCompletedTxs();
    },
    /** @type {typeof chainHub.updateChain} */
    updateChain(chainName, chainInfo) {
      return chainHub.updateChain(chainName, chainInfo);
    },
    /** @type {typeof chainHub.registerChain} */
    registerChain(chainName, chainInfo) {
      return chainHub.registerChain(chainName, chainInfo);
    },
  });

  const publicFacet = zone.exo('Fast USDC Public', undefined, {
    makeDepositInvitation() {
      return poolKit.public.makeDepositInvitation();
    },
    makeWithdrawInvitation() {
      return poolKit.public.makeWithdrawInvitation();
    },
    getPublicTopics() {
      return poolKit.public.getPublicTopics();
    },
    getStaticInfo() {
      baggage.has(ADDRESSES_BAGGAGE_KEY) ||
        Fail`no addresses. creator must 'publishAddresses' first`;
      const addresses: ContractRecord = baggage.get(ADDRESSES_BAGGAGE_KEY);
      return harden({
        [ADDRESSES_BAGGAGE_KEY]: addresses,
      });
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

  publishFeeConfig(storageNode, marshaller, feeConfig);

  const shareMint = await provideSingleton(
    zone.mapStore('mint'),
    'PoolShare',
    () =>
      zcf.makeZCFMint('PoolShares', AssetKind.NAT, {
        decimalPlaces: 6,
      }),
  );

  const poolKit = zone.makeOnce('Liquidity Pool kit', () =>
    makeLiquidityPoolKit(shareMint, privateArgs.poolMetricsNode),
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
  const [poolAccount, settlementAccount] = (await vowTools.when(
    vowTools.all([poolAccountV, settleAccountV]),
  )) as [
    HostInterface<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
    HostInterface<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
  ];
  trace('settlementAccount', settlementAccount);
  trace('poolAccount', poolAccount);
  const settlementAddress = await E(settlementAccount).getAddress();
  trace('settlementAddress', settlementAddress);

  const [_agoric, _noble, agToNoble] = await vowTools.when(
    chainHub.getChainsAndConnection('agoric', 'noble'),
  );
  const settlerKit = zone.makeOnce('settlerKit', () =>
    makeSettler({
      repayer: poolKit.repayer,
      sourceChannel: agToNoble.transferChannel.counterPartyChannelId,
      remoteDenom: 'uusdc',
      settlementAccount,
    }),
  );

  // we create a new Advancer on every upgrade. It does not contain precious state, but on each
  // upgrade we must remember to call `advancer.setIntermediateAccount()`
  // XXX delete `Advancer` that still may remain in zone after `update-settler-reference.core.js`
  const advancer = makeAdvancer({
    borrower: poolKit.borrower,
    notifier: settlerKit.notifier,
    poolAccount,
    settlementAddress,
  });

  // Connect evidence stream to advancer
  void observeIteration(subscribeEach(feedKit.public.getEvidenceSubscriber()), {
    updateState(evidenceWithRisk) {
      try {
        void advancer.handleTransactionEvent(evidenceWithRisk);
      } catch (err) {
        trace('🚨 Error handling transaction event', err);
      }
    },
  });

  await settlerKit.creator.monitorMintingDeposits();

  return harden({ creatorFacet, publicFacet });
};
harden(contract);

export const start = withOrchestration(contract, {
  chainInfoValueShape: CosmosChainInfoShapeV1,
});
harden(start);

export type FastUsdcSF = typeof start;
