import type { MsgTransfer } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import { VTRANSFER_IBC_EVENT } from '@agoric/internal/src/action-types.js';
import {
  defaultSerializer,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { setupFakeNetwork } from '@agoric/orchestration/test/network-fakes.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import {
  makeNameHubKit,
  type IBCChannelID,
  type VTransferIBCEvent,
} from '@agoric/vats';
import { prepareBridgeTargetModule } from '@agoric/vats/src/bridge-target.js';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import {
  prepareLocalChainTools,
  type AdditionalTransferPowers,
} from '@agoric/vats/src/localchain.js';
import { prepareTransferTools } from '@agoric/vats/src/transfer.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import {
  makeFakeLocalchainBridge,
  makeFakeTransferBridge,
} from '@agoric/vats/tools/fake-bridge.js';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import { objectMap } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import { withChainCapabilities } from '../index.js';
import cctpChainInfo from '../src/cctp-chain-info.js';
import { registerKnownChains } from '../src/chain-info.js';
import { makeChainHub } from '../src/exos/chain-hub.js';
import { prepareCosmosInterchainService } from '../src/exos/cosmos-interchain-service.js';
import fetchedChainInfo from '../src/fetched-chain-info.js';
import { makeTestAddress } from './make-test-address.js';

export const ROOT_STORAGE_PATH = 'orchtest'; // Orchetration Contract Test

/**
 * Common setup for contract tests, without any specific asset configuration.
 */
export const setupOrchestrationTest = async ({
  log,
}: {
  log: ExecutionContext<any>['log'];
}) => {
  // The common setup cannot support a durable zone because many of the fakes are not durable.
  // They were made before we had durable kinds (and thus don't take a zone or baggage).
  // To test durability in unit tests, test a particular entity with `relaxDurabilityRules: false`.
  // To test durability integrating multiple vats, use a RunUtils/bootstrap test.
  const rootZone = makeHeapZone();

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();

  const bankBridgeMessages = [] as any[];
  const { bankManager, pourPayment } = await makeFakeBankManagerKit({
    onToBridge: obj => bankBridgeMessages.push(obj),
  });
  // XXX real bankManager does this. fake should too?
  // TODO https://github.com/Agoric/agoric-sdk/issues/9966
  await makeWellKnownSpaces(agoricNamesAdmin, log, ['vbankAsset']);

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

  const localBridgeLog: { obj: any; result: any }[] = [];
  const localchainBridge = makeFakeLocalchainBridge(
    rootZone,
    (obj, result) => localBridgeLog.push({ obj, result }),
    makeTestAddress,
  );
  /** @returns {ReadonlyArray<any>} the input messages sent to the localchain bridge */
  const inspectLocalBridge = () =>
    harden(localBridgeLog.map(entry => entry.obj));

  const powersForTransfer = rootZone.weakMapStore(
    'powersForTransfer',
  ) as AdditionalTransferPowers;
  const makeLocalChain = prepareLocalChainTools(
    rootZone.subZone('localchain'),
    {
      ...vowTools,
      powersForTransfer,
    },
  );
  const localchain = makeLocalChain({
    bankManager,
    system: localchainBridge,
    transfer: transferMiddleware,
  });
  powersForTransfer.init(
    transferMiddleware,
    harden({ transferBridgeManager: transferBridge }),
  );

  const timer = buildZoeManualTimer(log);
  const board = makeFakeBoard();
  const marshaller = board.getPublishingMarshaller();
  const storage = makeFakeStorageKit(ROOT_STORAGE_PATH);

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

  type TransferMessageInfo = {
    message: MsgTransfer;
    sequence: bigint;
  };
  /**
   * Find the Nth outgoing MsgTransfer and its sequence number from the localchain bridge log.
   * @param index 0-based index from the start, or negative index from the end.
   * @returns {TransferMessageInfo} The MsgTransfer message and its sequence number.
   * @throws If index is out of bounds or sequence is not found in the log result.
   */
  const outgoingTransferAt = (index: number) => {
    const transferMessagesInfo: TransferMessageInfo[] = [];
    const isRelevant = ({ obj, result }) =>
      obj.type === 'VLOCALCHAIN_EXECUTE_TX' &&
      obj.messages &&
      Array.isArray(result);
    for (const { obj, result } of localBridgeLog.filter(isRelevant)) {
      // `obj.messages` and `result` are paired arrays.
      for (let i = 0; i < obj.messages.length; i += 1) {
        const message = obj.messages[i];
        if (message['@type'] === '/ibc.applications.transfer.v1.MsgTransfer') {
          const messageResult = result[i];
          try {
            const sequence = BigInt(messageResult.sequence);
            transferMessagesInfo.push({ message, sequence });
          } catch (cause) {
            throw new Error(
              `Sequence not found in result for MsgTransfer: ${JSON.stringify(message)}`,
              { cause },
            );
          }
        }
      }
    }
    const transferMessageInfo = transferMessagesInfo.at(index);
    if (!transferMessageInfo) {
      throw new Error(
        `Index ${index} out of bounds for ${transferMessagesInfo.length} outgoing transfers.`,
      );
    }
    return transferMessageInfo;
  };

  /**
   * Simulate an inbound VTransferIBCEvent message to the vtransfer bridge for a specific transfer.
   *
   * @param event The type of IBC event ('acknowledgementPacket' or 'timeoutPacket').
   * @param query Index of the outgoing transfer (e.g., -1 for the last one) or the `{ message: MsgTransfer, sequence: bigint }` object itself.
   * @param acknowledgementError Optional error string for acknowledgementPacket events.
   *
   * @example
   * ```js
   * // send ack for the last transfer
   * await transmitVTransferEvent('acknowledgementPacket', -1);
   * // send ack error for the first transfer
   * await transmitVTransferEvent('acknowledgementPacket', 0, 'simulated error');
   * // send timeout for the second-to-last transfer
   * await transmitVTransferEvent('timeoutPacket', -2);
   * ```
   */
  const transmitVTransferEvent = async (
    event: VTransferIBCEvent['event'],
    query: number | { message: MsgTransfer; sequence: bigint },
    acknowledgementError?: string,
  ) => {
    // let the promise for the transfer start (if any)
    await eventLoopIteration();

    const transferInfo =
      typeof query === 'number' ? outgoingTransferAt(query) : query;

    const { message: msg, sequence } = transferInfo;

    const base = {
      receiver: msg.receiver,
      sender: msg.sender,
      target: msg.sender, // target is usually the sender for outgoing transfers
      sourceChannel: msg.sourceChannel as IBCChannelID,
      sequence, // Use sequence from transferInfo
      amount: BigInt(msg.token.amount),
      denom: msg.token.denom,
      memo: msg.memo,
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

  /** A chainHub for Exo tests, distinct from the one a contract makes within `withOrchestration` */
  const chainHub = makeChainHub(
    rootZone.subZone('chainHub'),
    agoricNames,
    vowTools,
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
    };
  })();

  return {
    bootstrap: {
      agoricNames,
      agoricNamesAdmin,
      bankManager,
      board,
      timer,
      localchain,
      cosmosInterchainService,
      storage: {
        ...storage,
        /**
         * Read pure data (CapData that has no slots) from the storage path
         */
        getDeserialized(path: string): unknown[] {
          return storage.getValues(path).map(defaultSerializer.parse);
        },
      },
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
      chainInfo,
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
      inspectLocalBridge,
      inspectDibcBridge: () => E(ibcBridge).inspectDibcBridge(),
      inspectBankBridge: () => harden([...bankBridgeMessages]),
      outgoingTransferAt,
      rootZone,
      transmitVTransferEvent,
      vowTools,
    },
  };
};
