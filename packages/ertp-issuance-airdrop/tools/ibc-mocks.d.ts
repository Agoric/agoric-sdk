/** @file Tools to support making IBC mocks */
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { RequestQuery, ResponseQuery } from '@agoric/cosmic-proto/tendermint/abci/types.js';
import { type JsonSafe } from '@agoric/cosmic-proto';
import { IBCChannelID, IBCEvent, VTransferIBCEvent } from '@agoric/vats';
import type { PacketSDKType } from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { ChainAddress } from '../src/orchestration-api.js';
interface EncoderI<T> {
    encode: (message: T) => {
        finish: () => Uint8Array;
    };
    fromPartial: (partial: Partial<T>) => T;
    typeUrl: string;
}
/**
 * Build a response "packet bytes string" we'd expect to see from a Msg
 * Response
 *
 * XXX support multiple responses in a single message
 *
 * @param Encoder
 * @param message
 */
export declare function buildMsgResponseString<T>(Encoder: EncoderI<T>, message: Partial<T>): string;
/**
 * Build an example error packet for a failed Tx Msg
 * @param msg
 */
export declare function buildMsgErrorString(msg?: string): string;
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
export declare function buildQueryResponseString<T>(Encoder: EncoderI<T>, query: Partial<T>, opts?: Omit<ResponseQuery, 'key'>): string;
/**
 * Build a tx packet string for the mocked dibc bridge handler
 * @param msgs
 * @returns {string}
 */
export declare function buildTxPacketString(msgs: {
    value: Uint8Array;
    typeUrl: string;
}[]): string;
/**
 * Parse an outgoing ica tx packet. Useful for testing when inspecting
 * outgoing dibc bridge messages.
 *
 * @param b64 base64 encoded string
 */
export declare const parseOutgoingTxPacket: (b64: string) => TxBody;
/**
 * Build a query packet string for the mocked dibc bridge handler
 * @param msgs
 * @param opts
 * @returns {string}
 */
export declare function buildQueryPacketString(msgs: Any[], opts?: Partial<Omit<RequestQuery, 'path' | 'data'>>): string;
type BuildVTransferEventParams = {
    event?: VTransferIBCEvent['event'];
    sender?: ChainAddress['value'];
    receiver?: ChainAddress['value'];
    target?: ChainAddress['value'];
    amount?: bigint;
    denom?: string;
    destinationChannel?: IBCChannelID;
    sourceChannel?: IBCChannelID;
    sequence?: PacketSDKType['sequence'] | JsonSafe<PacketSDKType['sequence']>;
};
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
 *
 * @param {{BuildVTransferEventParams}} args
 */
export declare const buildVTransferEvent: ({ event, sender, receiver, target, amount, denom, destinationChannel, sourceChannel, sequence, }?: BuildVTransferEventParams) => VTransferIBCEvent;
export declare function createMockAckMap(mockMap: Record<string, {
    msg: string;
    ack: string;
}>): {};
/**
 * Simulate an IBC channelCloseConfirm event. This can be used to simulate an
 * ICA channel closing for an unexpected reason from a remote chain, _or
 * anything besides the Connection holder calling `.close()`_. If `close()` is
 * called, we'd instead expect to see a Downcall for channelCloseInit.
 *
 * @param {Pick<IBCEvent<'channelCloseConfirm'>, 'portID' | 'channelID'>} event
 */
export declare const buildChannelCloseConfirmEvent: ({ channelID, portID, }?: Partial<IBCEvent<"channelCloseConfirm">>) => Partial<IBCEvent<"channelCloseConfirm">>;
export {};
//# sourceMappingURL=ibc-mocks.d.ts.map