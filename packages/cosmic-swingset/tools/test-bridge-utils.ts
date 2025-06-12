import {
  icaMocks,
  protoMsgMockMap,
  protoMsgMocks,
} from '@aglocal/boot/tools/ibc/mocks.js';
import { BridgeId, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import type { IBCDowncallMethod, IBCMethod } from '@agoric/vats';
import { fakeLocalChainBridgeTxMsgHandler } from '@agoric/vats/tools/fake-bridge.js';

export const AckBehavior = {
  /** inbound messages are delivered immediately */
  Immediate: 'IMMEDIATE',
  /** inbound responses never arrive (to simulate mis-configured connections etc.) */
  Never: 'NEVER',
  /** inbound responses are queued. use `flushInboundQueue()` to simulate the remote response */
  Queued: 'QUEUED',
} as const;

export type AckBehaviors = Partial<
  Record<BridgeId, Partial<Record<IBCDowncallMethod, AckBehaviorType>>>
>;

export type AckBehaviorType = (typeof AckBehavior)[keyof typeof AckBehavior];

export const makeMockBridgeKit = (
  params: Partial<{
    ackBehaviors: Partial<
      Record<
        BridgeId,
        Partial<
          Record<
            IBCDowncallMethod,
            (typeof AckBehavior)[keyof typeof AckBehavior]
          >
        >
      >
    >;
    bech32Prefix: string;
    inbound: (bridgeId: BridgeId, ...args: any[]) => void;
    outboundMessages: Map<string, any>;
    pushInbound: (bridgeId: BridgeId, arg1: unknown) => void;
    storageKit: import('@agoric/internal/src/storage-test-utils.js').FakeStorageKit;
  }> = {},
) => {
  if (!params.outboundMessages) params.outboundMessages = new Map();
  if (!params.storageKit) params.storageKit = makeFakeStorageKit('');

  let ibcSequenceNonce = 0;
  let lastBankNonce = 0n;
  let lcaAccountsCreated = 0;
  let lcaSequenceNonce = 0;

  const ackImmediately = (obj: IBCMethod<'sendPacket'>, ack: string) => {
    ibcSequenceNonce += 1;
    const msg = icaMocks.ackPacketEvent(obj, ibcSequenceNonce, ack);
    setTimeout(() => params.inbound?.(BridgeId.DIBC, msg));
    return msg.packet;
  };

  const ackLater = (obj: IBCMethod<'sendPacket'>, ack: string) => {
    ibcSequenceNonce += 1;
    const msg = icaMocks.ackPacketEvent(obj, ibcSequenceNonce, ack);
    params.pushInbound?.(BridgeId.DIBC, msg);
  };

  const shouldAckImmediately = (
    bridgeId: BridgeId,
    method: IBCDowncallMethod,
  ) => params.ackBehaviors?.[bridgeId]?.[method] === AckBehavior.Immediate;

  const mockBridgeReceiver = (bridgeId: BridgeId, obj: any) => {
    if (!params.outboundMessages!.has(bridgeId))
      params.outboundMessages!.set(bridgeId, []);
    params.outboundMessages!.get(bridgeId).push(obj);

    const bridgeType = `${bridgeId}:${obj.type}`;

    switch (bridgeId) {
      case BridgeId.STORAGE:
        return params.storageKit!.toStorage(obj);
      default:
        break;
    }

    switch (bridgeType) {
      case `${BridgeId.BANK}:VBANK_GET_BALANCE`:
        return '0';
      case `${BridgeId.BANK}:VBANK_GET_MODULE_ACCOUNT_ADDRESS`: {
        const { moduleName } = obj;
        const moduleDescriptor = Object.values(VBankAccount).find(
          ({ module }) => module === moduleName,
        );

        if (moduleDescriptor) return moduleDescriptor.address;
        else break;
      }
      case `${BridgeId.BANK}:VBANK_GIVE`:
      case `${BridgeId.BANK}:VBANK_GRAB`: {
        lastBankNonce += 1n;
        return harden({
          nonce: `${lastBankNonce}`,
          type: 'VBANK_BALANCE_UPDATE',
          updated: [],
        });
      }

      case `${BridgeId.CORE}:IBC_METHOD`:
      case `${BridgeId.DIBC}:IBC_METHOD`:
      case `${BridgeId.VTRANSFER}:IBC_METHOD`: {
        switch (obj.method) {
          case 'startChannelOpenInit': {
            const message = icaMocks.channelOpenAck(obj, params.bech32Prefix);
            if (
              params.ackBehaviors?.[bridgeId]?.startChannelOpenInit ===
              AckBehavior.Never
            )
              break;

            const handle = shouldAckImmediately(bridgeId, obj.method)
              ? params.inbound
              : params.pushInbound;

            handle?.(BridgeId.DIBC, message);
            break;
          }
          case 'sendPacket': {
            const mockAckMapHasData = obj.packet.data in protoMsgMockMap;
            if (mockAckMapHasData)
              ackLater(obj, protoMsgMockMap[obj.packet.data]);
            else {
              console.warn(
                `${obj.method} acking err because no mock ack for b64 data key: '${obj.packet.data}'`,
              );

              // An error that would be triggered before reception on another chain
              return ackImmediately(obj, protoMsgMocks.error.ack);
            }
            break;
          }
          default:
            break;
        }
        break;
      }

      case `${BridgeId.VLOCALCHAIN}:VLOCALCHAIN_ALLOCATE_ADDRESS`: {
        const address = makeTestAddress(lcaAccountsCreated);
        lcaAccountsCreated += 1;
        return address;
      }
      case `${BridgeId.VLOCALCHAIN}:VLOCALCHAIN_EXECUTE_TX`: {
        lcaSequenceNonce += 1;
        return obj.messages.map(message =>
          fakeLocalChainBridgeTxMsgHandler(message, lcaSequenceNonce),
        );
      }
      default:
        break;
    }

    return String(undefined);
  };

  return mockBridgeReceiver;
};
