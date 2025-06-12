/** @file Tools to support making IBC mocks */
import { type JsonSafe, toRequestQueryJson } from '@agoric/cosmic-proto';
import { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { PacketSDKType } from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import { CosmosResponse } from '@agoric/cosmic-proto/icq/v1/packet.js';
import {
  RequestQuery,
  ResponseQuery,
} from '@agoric/cosmic-proto/tendermint/abci/types.js';
import {
  IBC_EVENT,
  VTRANSFER_IBC_EVENT,
} from '@agoric/internal/src/action-types.js';
import type {
  IBCChannelID,
  IBCEvent,
  IBCPacket,
  VTransferIBCEvent,
} from '@agoric/vats';
import { LOCALCHAIN_DEFAULT_ADDRESS } from '@agoric/vats/tools/fake-bridge.js';
import { atob, btoa, decodeBase64, encodeBase64 } from '@endo/base64';
import type { CosmosChainAddress, Denom } from '../src/orchestration-api.js';
import { makeQueryPacket, makeTxPacket } from '../src/utils/packet.js';

interface EncoderCommon<T> {
  encode: (message: T) => {
    finish: () => Uint8Array;
  };
  fromPartial: (partial: Partial<T>) => T;
  typeUrl: string;
}

const toPacket = (obj: Record<string, any>): string =>
  btoa(JSON.stringify(obj));

/**
 * Build a response "packet bytes string" we'd expect to see from a Msg
 * Response
 *
 * XXX support multiple responses in a single message
 *
 * @param Encoder
 * @param message
 */
export function buildMsgResponseString<T>(
  Encoder: EncoderCommon<T>,
  message: Partial<T>,
): string {
  const encodedMsg = Encoder.encode(Encoder.fromPartial(message)).finish();

  // cosmos-sdk double Any encodes
  const encodedAny = Any.encode(
    Any.fromPartial({
      value: Any.encode(
        Any.fromPartial({
          typeUrl: Encoder.typeUrl,
          value: encodedMsg,
        }),
      ).finish(),
    }),
  ).finish();

  return toPacket({
    result: encodeBase64(encodedAny),
  });
}

/**
 * Build an example error packet for a failed Tx Msg
 * @param msg
 */
export function buildMsgErrorString(
  msg = 'ABCI code: 5: error handling packet: see events for details',
): string {
  return toPacket({
    error: msg,
  });
}

/**
 * Build a response "packet bytes string" we'd expect to see from a Query
 * request
 *
 * XXX accept multiple queries at once
 *
 * @param Encoder
 * @param query
 * @param opts
 */
export function buildQueryResponseString<T>(
  Encoder: EncoderCommon<T>,
  query: Partial<T>,
  opts: Omit<ResponseQuery, 'key'> = {
    value: new Uint8Array(),
    height: 0n,
    index: 0n,
    code: 0,
    log: '',
    info: '',
    codespace: '',
  },
): string {
  const encodedResp = CosmosResponse.encode(
    CosmosResponse.fromPartial({
      responses: [
        {
          key: Encoder.encode(Encoder.fromPartial(query)).finish(),
          ...opts,
        },
      ],
    }),
  ).finish();

  return toPacket({
    result: toPacket({ data: encodeBase64(encodedResp) }),
  });
}

/**
 * Build a tx packet string for the mocked dibc bridge handler
 * @param msgs
 * @returns {string}
 */
export function buildTxPacketString(
  msgs: { value: Uint8Array; typeUrl: string }[],
): string {
  return btoa(makeTxPacket(msgs.map(Any.toJSON)));
}

/**
 * Parse an outgoing ica tx packet. Useful for testing when inspecting
 * outgoing dibc bridge messages.
 *
 * @param b64 base64 encoded string
 */
export const parseOutgoingTxPacket = (b64: string) => {
  return TxBody.decode(decodeBase64(JSON.parse(atob(b64)).data));
};

/**
 * Build a query packet string for the mocked dibc bridge handler
 * @param msgs
 * @param opts
 * @returns {string}
 */
export function buildQueryPacketString(
  msgs: Any[],
  opts: Partial<Omit<RequestQuery, 'path' | 'data'>> = {},
): string {
  return btoa(makeQueryPacket(msgs.map(msg => toRequestQueryJson(msg, opts))));
}

/**
 * Fields that are common to every vtransfer IBC event.
 */
type BuildVTransferEventBaseParams = {
  /**
   * defaults to `cosmos1AccAddress` – set to `agoric1fakeLCAAddress` to
   *  simulate an outgoing transfer.
   */
  sender?: CosmosChainAddress['value'] | string;

  /**
   * defaults to `agoric1fakeLCAAddress` – set differently to simulate
   *  an outgoing transfer.
   */
  receiver?: CosmosChainAddress['value'] | string;

  target?: CosmosChainAddress['value'] | string;
  amount?: bigint;
  denom?: Denom;
  destinationChannel?: IBCChannelID;
  sourceChannel?: IBCChannelID;

  /** supports `bigint` or `string` so tests can pass encoded numbers */
  sequence?: PacketSDKType['sequence'] | JsonSafe<PacketSDKType['sequence']>;
  memo?: string;
};

/**
 * Parameters allowed for the ACK-carrying events.
 */
type VTransferAckParams = BuildVTransferEventBaseParams & {
  event?: 'acknowledgementPacket' | 'writeAcknowledgement';
  /**
   * if present, helper encodes `{ error: acknowledgementError }`
   *  instead of the success result
   */
  acknowledgementError?: string;
  /** override the default `"agoric123"` relayer address */
  relayer?: string;
};

/**
 * Parameters allowed for a timeout event (no ack/relayer).
 */
type VTransferTimeoutParams = BuildVTransferEventBaseParams & {
  event: 'timeoutPacket';
  acknowledgementError?: never;
  relayer?: never;
};

type VTransferParams = VTransferAckParams | VTransferTimeoutParams;

/** helper to turn param object into correct return */
type ExtractEvent<P> =
  // event present?
  P extends { event: infer Ev }
    ? // undefined means “use default”
      Ev extends undefined
      ? 'acknowledgementPacket'
      : Ev
    : // no `event` entry, use default
      'acknowledgementPacket';

type BuildVTransferEventResult<P extends VTransferParams> = VTransferByEvent<
  ExtractEvent<P>
>;

type VTransferByEvent<E extends VTransferIBCEvent['event']> = Extract<
  VTransferIBCEvent,
  { event: E }
>;

/**
 * `buildVTransferEvent` can be used with `transferBridge` to simulate incoming
 * and outgoing IBC fungible tokens transfers to a LocalChain account.
 *
 * It defaults to simulating incoming transfers. To simulate an outgoing one,
 * ensure `sender=agoric1fakeLCAAddress` and  this after LocalChainBridge
 * receives the outgoing MsgTransfer,
 *
 * @example
 * ```js
 * const { mocks: { transferBridge } = await commonSetup(t);
 * await E(transferBridge).fromBridge(
 *  buildVTransferEvent({
 *    receiver: 'agoric1fakeLCAAddress',
 *    amount: 10n,
 *    denom: 'uatom',
 *  }),
 * );
 * ```
 *
 * XXX integrate vlocalchain and vtransfer ScopedBridgeManagers
 * in test supports.
 */
export function buildVTransferEvent<P extends VTransferParams>(
  params: P,
): BuildVTransferEventResult<P> {
  const {
    event = 'acknowledgementPacket',
    sender = 'cosmos1AccAddress',
    receiver = LOCALCHAIN_DEFAULT_ADDRESS,
    target = LOCALCHAIN_DEFAULT_ADDRESS,
    amount = 10n,
    denom = 'uatom',
    destinationChannel = 'channel-0',
    sourceChannel = 'channel-405',
    sequence = 0n,
    memo = '',
    relayer = 'agoric123',
    acknowledgementError,
  } = params satisfies VTransferParams;

  const base = {
    type: VTRANSFER_IBC_EVENT,
    blockHeight: 0,
    blockTime: 0,
    event,
    target,
    packet: {
      data: btoa(
        JSON.stringify(
          FungibleTokenPacketData.fromPartial({
            amount: String(amount),
            denom,
            sender,
            receiver,
            memo,
          }),
        ),
      ),
      destination_channel: destinationChannel as IBCChannelID,
      source_channel: sourceChannel as IBCChannelID,
      destination_port: 'transfer',
      source_port: 'transfer',
      // @ts-expect-error – supports `bigint` or `string` so tests can pass encoded numbers
      sequence,
    } satisfies IBCPacket,
  };

  /** `timeoutPacket` */
  if (event === 'timeoutPacket') {
    return base as BuildVTransferEventResult<P>;
  }

  /** `acknowledgementPacket`, `writeAcknowledgement`*/
  return {
    ...base,
    relayer,
    acknowledgement: btoa(
      JSON.stringify(
        acknowledgementError
          ? { error: acknowledgementError }
          : { result: 'AQ==' },
      ),
    ),
  } as BuildVTransferEventResult<P>;
}

export function createMockAckMap(
  mockMap: Record<string, { msg: string; ack: string }>,
) {
  const res = Object.values(mockMap).reduce((acc, { msg, ack }) => {
    acc[msg] = ack;
    return acc;
  }, {});
  return res;
}

/**
 * Simulate an IBC channelCloseConfirm event. This can be used to simulate an
 * ICA channel closing for an unexpected reason from a remote chain, _or
 * anything besides the Connection holder calling `.close()`_. If `close()` is
 * called, we'd instead expect to see a Downcall for channelCloseInit.
 *
 * @param {Pick<IBCEvent<'channelCloseConfirm'>, 'portID' | 'channelID'>} event
 */
export const buildChannelCloseConfirmEvent = ({
  channelID = 'channel-0',
  portID = 'icacontroller-1',
}: Partial<IBCEvent<'channelCloseConfirm'>> = {}): Partial<
  IBCEvent<'channelCloseConfirm'>
> => ({
  blockHeight: 0,
  blockTime: 0,
  channelID,
  event: 'channelCloseConfirm',
  portID,
  type: IBC_EVENT,
});
