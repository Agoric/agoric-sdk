import type { MsgTransfer } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import { makeIssuerKit } from '@agoric/ertp';
import { CosmosChainInfoShapeV1 } from '@agoric/fast-usdc/src/type-guards.js';
import type { ChainHubChainInfo } from '@agoric/fast-usdc/src/types.js';
import { VTRANSFER_IBC_EVENT } from '@agoric/internal/src/action-types.js';
import {
  defaultSerializer,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  denomHash,
  withChainCapabilities,
  type Bech32Address,
  type CosmosChainInfo,
  type Denom,
} from '@agoric/orchestration';
import cctpChainInfo from '@agoric/orchestration/src/cctp-chain-info.js';
import { registerKnownChains } from '@agoric/orchestration/src/chain-info.js';
import {
  makeChainHub,
  type DenomDetail,
} from '@agoric/orchestration/src/exos/chain-hub.js';
import { prepareCosmosInterchainService } from '@agoric/orchestration/src/exos/cosmos-interchain-service.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { setupFakeNetwork } from '@agoric/orchestration/test/network-fakes.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import {
  makeNameHubKit,
  type IBCChannelID,
  type VTransferIBCEvent,
} from '@agoric/vats';
import { prepareBridgeTargetModule } from '@agoric/vats/src/bridge-target.js';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { prepareLocalChainTools } from '@agoric/vats/src/localchain.js';
import { prepareTransferTools } from '@agoric/vats/src/transfer.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import {
  makeFakeLocalchainBridge,
  makeFakeTransferBridge,
} from '@agoric/vats/tools/fake-bridge.js';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone, type Zone } from '@agoric/zone';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/far';
import { objectMap } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import { makeTestFeeConfig } from './mocks.js';

export {
  makeFakeLocalchainBridge,
  makeFakeTransferBridge,
} from '@agoric/vats/tools/fake-bridge.js';

const assetOn = (
  baseDenom: Denom,
  baseName: string,
  chainName?: string,
  infoOf?: Record<string, CosmosChainInfo>,
  brandKey?: string,
): [string, DenomDetail & { brandKey?: string }] => {
  if (!chainName) {
    return [baseDenom, { baseName, chainName: baseName, baseDenom }];
  }
  if (!infoOf) throw Error(`must provide infoOf`);
  const issuerInfo = infoOf[baseName];
  const holdingInfo = infoOf[chainName];
  if (!holdingInfo) throw Error(`${chainName} missing`);
  if (!holdingInfo.connections)
    throw Error(`connections missing for ${chainName}`);
  const { channelId } =
    holdingInfo.connections[issuerInfo.chainId].transferChannel;
  const denom = `ibc/${denomHash({ denom: baseDenom, channelId })}`;
  return [denom, { baseName, chainName, baseDenom, brandKey }];
};

export const [uusdcOnAgoric, agUSDCDetail] = assetOn(
  'uusdc',
  'noble',
  'agoric',
  fetchedChainInfo,
  'USDC',
);

export const commonSetup = async (t: ExecutionContext<any>) => {
  // The common setup cannot support a durable zone because many of the fakes are not durable.
  // They were made before we had durable kinds (and thus don't take a zone or baggage).
  // To test durability in unit tests, test a particular entity with `relaxDurabilityRules: false`.
  // To test durability integrating multiple vats, use a RunUtils/bootstrap test.
  const rootZone = makeHeapZone();

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();

  const usdc = withAmountUtils(makeIssuerKit('USDC'));
  const bankBridgeMessages = [] as any[];
  const { bankManager, pourPayment } = await makeFakeBankManagerKit({
    onToBridge: obj => bankBridgeMessages.push(obj),
  });
  await E(bankManager).addAsset(
    uusdcOnAgoric,
    'USDC',
    'USD Circle Stablecoin',
    usdc.issuerKit,
  );
  // These mints no longer stay in sync with bankManager.
  // Use pourPayment() for IST.
  const { mint: _i, ...usdcSansMint } = usdc;
  // XXX real bankManager does this. fake should too?
  // TODO https://github.com/Agoric/agoric-sdk/issues/9966
  await makeWellKnownSpaces(agoricNamesAdmin, t.log, ['vbankAsset']);
  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    uusdcOnAgoric,
    /** @type {AssetInfo} */ harden({
      brand: usdc.brand,
      issuer: usdc.issuer,
      issuerName: 'USDC',
      denom: 'uusdc',
      proposedName: 'USDC',
      displayInfo: { IOU: true },
    }),
  );

  const vowTools = prepareSwingsetVowTools(rootZone.subZone('vows'));

  const transferBridge = makeFakeTransferBridge(rootZone);
  const { makeBridgeTargetKit } = prepareBridgeTargetModule(
    rootZone.subZone('bridge'),
  );
  const { makeTransferMiddlewareKit } = prepareTransferTools(
    rootZone.subZone('transfer'),
    vowTools,
  );

  const { finisher, interceptorFactory, transferMiddleware } =
    makeTransferMiddlewareKit();
  const bridgeTargetKit = makeBridgeTargetKit(
    transferBridge,
    VTRANSFER_IBC_EVENT,
    interceptorFactory,
  );
  finisher.useRegistry(bridgeTargetKit.targetRegistry);
  await E(transferBridge).initHandler(bridgeTargetKit.bridgeHandler);

  const localBridgeMessages = [] as any[];
  const localchainBridge = makeFakeLocalchainBridge(
    rootZone,
    obj => localBridgeMessages.push(obj),
    makeTestAddress,
  );
  const localchain = prepareLocalChainTools(
    rootZone.subZone('localchain'),
    vowTools,
  ).makeLocalChain({
    bankManager,
    system: localchainBridge,
    transfer: transferMiddleware,
  });
  const timer = buildZoeManualTimer(t.log);
  const marshaller = makeFakeBoard().getPublishingMarshaller();
  const storage = makeFakeStorageKit(
    'fun', // Fast USDC Node
  );
  /**
   * Read pure data (CapData that has no slots) from the storage path
   * @param path
   */
  storage.getDeserialized = (path: string): unknown =>
    storage.getValues(path).map(defaultSerializer.parse);

  const { portAllocator, setupIBCProtocol, ibcBridge } = setupFakeNetwork(
    rootZone.subZone('network'),
    { vowTools },
  );
  await setupIBCProtocol();

  const makeCosmosInterchainService = prepareCosmosInterchainService(
    rootZone.subZone('orchestration'),
    vowTools,
  );
  const cosmosInterchainService = makeCosmosInterchainService({
    portAllocator,
  });

  await registerKnownChains(agoricNamesAdmin, () => {});

  // XXX: copied from orchestration supports
  /** proxy for current sequence of the IBC Channel */
  let ibcSequenceNonce = 0n;
  /**
   * Simulate an inbound message to the vtransfer bridge.
   *
   * Uses the localchain bridge to lookup the last message and infer packet
   * and transaction details.
   *
   * Tracks `sequence` locally in test context, so this helper must be used
   * for all simulated VTransfer calls in a test run for sequence to be
   * accurate.
   *
   * @example
   * ```js
   * // send ack
   * await transmitVTransferEvent('acknowledgementPacket');
   * // send ack error
   * await transmitVTransferEvent('acknowledgementPacket', 'packet-forward-middleware error: giving up on packet on channel (channel-21) port (transfer) after max retries');
   * // send timeout
   * await transmitVTransferEvent('timeoutPacket');
   * ```
   */
  const transmitVTransferEvent = async (
    event: VTransferIBCEvent['event'],
    {
      acknowledgementError,
      transferMsg,
      overrideSequence,
    }: {
      acknowledgementError?: string;
    } & (
      | { transferMsg: MsgTransfer; overrideSequence: bigint }
      | { transferMsg?: never; overrideSequence?: never }
    ) = {},
  ) => {
    let lastMsgTransfer: MsgTransfer;
    let sequence: bigint;

    if (transferMsg && overrideSequence !== undefined) {
      // Use provided transfer message and sequence
      lastMsgTransfer = transferMsg;
      sequence = overrideSequence;
    } else {
      // Original behavior: look up from local bridge messages
      // assume this is called after each outgoing IBC transfer
      ibcSequenceNonce += 1n;
      // let the promise for the transfer start
      await eventLoopIteration();
      if (localBridgeMessages.length < 1)
        throw Error('no messages on the local bridge');

      const b1 = localBridgeMessages.at(-1);
      if (!b1.messages || b1.messages.length < 1)
        throw Error('no messages in the last tx');

      lastMsgTransfer = b1.messages[0] as MsgTransfer;
      sequence = ibcSequenceNonce;
    }

    const base = {
      receiver: lastMsgTransfer.receiver as Bech32Address,
      sender: lastMsgTransfer.sender as Bech32Address,
      target: lastMsgTransfer.sender as Bech32Address,
      sourceChannel: lastMsgTransfer.sourceChannel as IBCChannelID,
      sequence,
      amount: BigInt(lastMsgTransfer.token.amount),
      denom: lastMsgTransfer.token.denom,
      memo: lastMsgTransfer.memo,
    };

    await E(transferBridge).fromBridge(
      buildVTransferEvent(
        event === 'timeoutPacket'
          ? { event, ...base }
          : { event, ...base, acknowledgementError },
      ),
    );
    // let the bridge handler finish
    await eventLoopIteration();
  };
  /**
   * simulate incoming message as if the transfer completed over IBC
   * @deprecated use `transmitVTransferEvent('acknowledgementPacket')` directly
   */
  const transmitTransferAck = async () =>
    transmitVTransferEvent('acknowledgementPacket');

  /** A chainHub for Exo tests, distinct from the one a contract makes within `withOrchestration` */
  const chainHub = makeChainHub(
    rootZone.subZone('chainHub'),
    agoricNames,
    vowTools,
    {
      chainInfoValueShape: CosmosChainInfoShapeV1,
    },
  );

  const chainInfo = harden(() => {
    const { agoric, osmosis, noble } = withChainCapabilities(fetchedChainInfo);
    const { ethereum, solana } = objectMap(cctpChainInfo, v => ({
      ...v,
      // for backwards compatibility with `CosmosChainInfoShapeV1` which expects a `chainId`
      chainId: `${v.namespace}:${v.reference}`,
    }));
    return {
      agoric,
      osmosis,
      noble,
      ethereum,
      solana,
    } as Record<string, ChainHubChainInfo>;
  })();

  const assetInfo: [Denom, DenomDetail & { brandKey?: string }][] = harden([
    assetOn('uusdc', 'noble'),
    [uusdcOnAgoric, agUSDCDetail],
    assetOn('uusdc', 'noble', 'osmosis', fetchedChainInfo),
  ]);

  return {
    bootstrap: {
      agoricNames,
      agoricNamesAdmin,
      bankManager,
      timer,
      localchain,
      cosmosInterchainService,
      storage,
    },
    brands: {
      usdc: usdcSansMint,
    },
    mocks: {
      ibcBridge,
      transferBridge,
    },
    commonPrivateArgs: {
      agoricNames,
      localchain,
      orchestrationService: cosmosInterchainService,
      storageNode: storage.rootNode,
      poolMetricsNode: storage.rootNode.makeChildNode('poolMetrics'),
      marshaller,
      timerService: timer,
      feeConfig: makeTestFeeConfig(usdc),
      chainInfo,
      assetInfo,
    },
    facadeServices: {
      agoricNames,
      /** A chainHub for Exo tests, distinct from the one a contract makes within `withOrchestration` */
      chainHub,
      localchain,
      orchestrationService: cosmosInterchainService,
      timerService: timer,
    },
    utils: {
      contractZone: rootZone.subZone('contract'),
      pourPayment,
      inspectLocalBridge: () => harden([...localBridgeMessages]),
      inspectDibcBridge: () => E(ibcBridge).inspectDibcBridge(),
      inspectBankBridge: () => harden([...bankBridgeMessages]),
      rootZone,
      transmitTransferAck,
      transmitVTransferEvent,
      vowTools,
    },
  };
};

/**
 * Reincarnate without relaxDurabilityRules and provide a durable zone in the incarnation.
 * @param key
 */
export const provideDurableZone = (key: string): Zone => {
  const { fakeVomKit } = reincarnate({ relaxDurabilityRules: false });
  const root = fakeVomKit.cm.provideBaggage();
  const zone = makeDurableZone(root);
  return zone.subZone(key);
};
