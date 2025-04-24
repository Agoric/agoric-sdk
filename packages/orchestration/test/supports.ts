import { makeIssuerKit } from '@agoric/ertp';
import { VTRANSFER_IBC_EVENT } from '@agoric/internal/src/action-types.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
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
import type { Installation } from '@agoric/zoe/src/zoeService/utils.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import type { ExecutionContext } from 'ava';
import type { MsgTransfer } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import { registerKnownChains } from '../src/chain-info.js';
import { makeChainHub } from '../src/exos/chain-hub.js';
import { prepareCosmosInterchainService } from '../src/exos/cosmos-interchain-service.js';
import fetchedChainInfo from '../src/fetched-chain-info.js';
import { buildVTransferEvent } from '../tools/ibc-mocks.js';
import { setupFakeNetwork } from './network-fakes.js';
import { withChainCapabilities } from '../src/chain-capabilities.js';
import { registerChainsAndAssets } from '../src/utils/chain-hub-helper.js';
import { assetOn } from '../src/utils/asset.js';
import type { Bech32Address } from '../src/cosmos-api.js';

export {
  makeFakeLocalchainBridge,
  makeFakeTransferBridge,
} from '@agoric/vats/tools/fake-bridge.js';

export const commonSetup = async (t: ExecutionContext<any>) => {
  t.log('bootstrap vat dependencies');
  // The common setup cannot support a durable zone because many of the fakes are not durable.
  // They were made before we had durable kinds (and thus don't take a zone or baggage).
  // To test durability in unit tests, test a particular entity with `relaxDurabilityRules: false`.
  // To test durability integrating multiple vats, use a RunUtils/bootstrap test.
  const rootZone = makeHeapZone();

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();

  const bld = withAmountUtils(makeIssuerKit('BLD'));
  const ist = withAmountUtils(makeIssuerKit('IST'));
  const bankBridgeMessages = [] as any[];
  const { bankManager, pourPayment } = await makeFakeBankManagerKit({
    onToBridge: obj => bankBridgeMessages.push(obj),
  });
  await E(bankManager).addAsset('ubld', 'BLD', 'Staking Token', bld.issuerKit);
  await E(bankManager).addAsset(
    'uist',
    'IST',
    'Inter Stable Token',
    ist.issuerKit,
  );
  // These mints no longer stay in sync with bankManager.
  // Use pourPayment() for IST.
  const { mint: _b, ...bldSansMint } = bld;
  const { mint: _i, ...istSansMint } = ist;
  // XXX real bankManager does this. fake should too?
  // TODO https://github.com/Agoric/agoric-sdk/issues/9966
  await makeWellKnownSpaces(agoricNamesAdmin, t.log, ['vbankAsset']);
  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    'uist',
    /** @type {AssetInfo} */ harden({
      brand: ist.brand,
      issuer: ist.issuer,
      issuerName: 'IST',
      denom: 'uist',
      proposedName: 'IST',
      displayInfo: { IOU: true },
    }),
  );
  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    'ubld',
    /** @type {AssetInfo} */ harden({
      brand: bld.brand,
      issuer: bld.issuer,
      issuerName: 'BLD',
      denom: 'ubld',
      proposedName: 'BLD',
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
  const localchainBridge = makeFakeLocalchainBridge(rootZone, obj =>
    localBridgeMessages.push(obj),
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
  const marshaller = makeFakeBoard().getReadonlyMarshaller();
  const storage = makeFakeStorageKit('mockChainStorageRoot', {
    sequence: false,
  });

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
    acknowledgementError?: string,
  ) => {
    // assume this is called after each outgoing IBC transfer
    ibcSequenceNonce += 1n;
    // let the promise for the transfer start
    await eventLoopIteration();
    if (localBridgeMessages.length < 1)
      throw Error('no messages on the local bridge');

    const b1 = localBridgeMessages.at(-1);
    if (!b1.messages || b1.messages.length < 1)
      throw Error('no messages in the last tx');

    const lastMsgTransfer = b1.messages[0] as MsgTransfer;
    const base = {
      receiver: lastMsgTransfer.receiver as Bech32Address,
      sender: lastMsgTransfer.sender as Bech32Address,
      target: lastMsgTransfer.sender as Bech32Address,
      sourceChannel: lastMsgTransfer.sourceChannel as IBCChannelID,
      sequence: ibcSequenceNonce,
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

  const chainHub = makeChainHub(
    rootZone.subZone('chainHub'),
    agoricNames,
    vowTools,
  );

  /** add `pfmEnabled` to chainInfo */
  const chainInfoWithCaps = withChainCapabilities(fetchedChainInfo);

  /** for registration with `ChainHub` */
  const commonAssetInfo = harden([
    assetOn('ubld', 'agoric', bldSansMint.brand),
    assetOn('uist', 'agoric', istSansMint.brand),
    assetOn('uist', 'agoric', undefined, 'cosmoshub', chainInfoWithCaps),
    assetOn('uusdc', 'noble', undefined, 'agoric', chainInfoWithCaps),
    assetOn('uatom', 'cosmoshub', undefined, 'agoric', chainInfoWithCaps),
    assetOn('uusdc', 'noble', undefined, 'dydx', chainInfoWithCaps),
  ]);

  /**
   * Register known chains an assets into the test context's `ChainHub`.
   *
   * For contract tests with contracts that use `withOrchestration`, access
   * `chainInfo` and `assetInfo` from `commonPrivateArgs` and register in the
   * contract's ChainHub with `registerChainsAndAssets`.
   */
  const populateChainHub = () =>
    registerChainsAndAssets(
      chainHub,
      harden({ BLD: bldSansMint.brand, IST: istSansMint.brand }),
      chainInfoWithCaps,
      commonAssetInfo,
    );

  return {
    bootstrap: {
      agoricNames,
      agoricNamesAdmin,
      bankManager,
      timer,
      localchain,
      cosmosInterchainService,
      // TODO remove; bootstrap doesn't have a zone
      rootZone: rootZone.subZone('contract'),
      storage,
      // TODO remove; bootstrap doesn't have vowTools
      vowTools,
    },
    brands: {
      bld: bldSansMint,
      ist: istSansMint,
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
      marshaller,
      timerService: timer,
      chainInfo: withChainCapabilities(fetchedChainInfo),
      assetInfo: harden(commonAssetInfo),
    },
    facadeServices: {
      agoricNames,
      chainHub,
      localchain,
      orchestrationService: cosmosInterchainService,
      timerService: timer,
    },
    utils: {
      pourPayment,
      inspectLocalBridge: () => harden([...localBridgeMessages]),
      inspectDibcBridge: () => E(ibcBridge).inspectDibcBridge(),
      inspectBankBridge: () => harden([...bankBridgeMessages]),
      populateChainHub,
      transmitTransferAck,
      transmitVTransferEvent,
    },
  };
};

export const makeDefaultContext = <SF>(contract: Installation<SF>) => {};
