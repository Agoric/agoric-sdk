import { Height, type HeightSDKType } from '../../client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * State defines if a channel is in one of the following states:
 * CLOSED, INIT, TRYOPEN, OPEN, FLUSHING, FLUSHCOMPLETE or UNINITIALIZED.
 */
export declare enum State {
    /** STATE_UNINITIALIZED_UNSPECIFIED - Default State */
    STATE_UNINITIALIZED_UNSPECIFIED = 0,
    /** STATE_INIT - A channel has just started the opening handshake. */
    STATE_INIT = 1,
    /** STATE_TRYOPEN - A channel has acknowledged the handshake step on the counterparty chain. */
    STATE_TRYOPEN = 2,
    /**
     * STATE_OPEN - A channel has completed the handshake. Open channels are
     * ready to send and receive packets.
     */
    STATE_OPEN = 3,
    /**
     * STATE_CLOSED - A channel has been closed and can no longer be used to send or receive
     * packets.
     */
    STATE_CLOSED = 4,
    /** STATE_FLUSHING - A channel has just accepted the upgrade handshake attempt and is flushing in-flight packets. */
    STATE_FLUSHING = 5,
    /** STATE_FLUSHCOMPLETE - A channel has just completed flushing any in-flight packets. */
    STATE_FLUSHCOMPLETE = 6,
    UNRECOGNIZED = -1
}
export declare const StateSDKType: typeof State;
export declare function stateFromJSON(object: any): State;
export declare function stateToJSON(object: State): string;
/** Order defines if a channel is ORDERED or UNORDERED */
export declare enum Order {
    /** ORDER_NONE_UNSPECIFIED - zero-value for channel ordering */
    ORDER_NONE_UNSPECIFIED = 0,
    /**
     * ORDER_UNORDERED - packets can be delivered in any order, which may differ from the order in
     * which they were sent.
     */
    ORDER_UNORDERED = 1,
    /** ORDER_ORDERED - packets are delivered exactly in the order which they were sent */
    ORDER_ORDERED = 2,
    UNRECOGNIZED = -1
}
export declare const OrderSDKType: typeof Order;
export declare function orderFromJSON(object: any): Order;
export declare function orderToJSON(object: Order): string;
/**
 * Channel defines pipeline for exactly-once packet delivery between specific
 * modules on separate blockchains, which has at least one end capable of
 * sending packets and one end capable of receiving packets.
 * @name Channel
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Channel
 */
export interface Channel {
    /**
     * current state of the channel end
     */
    state: State;
    /**
     * whether the channel is ordered or unordered
     */
    ordering: Order;
    /**
     * counterparty channel end
     */
    counterparty: Counterparty;
    /**
     * list of connection identifiers, in order, along which packets sent on
     * this channel will travel
     */
    connectionHops: string[];
    /**
     * opaque channel version, which is agreed upon during the handshake
     */
    version: string;
    /**
     * upgrade sequence indicates the latest upgrade attempt performed by this channel
     * the value of 0 indicates the channel has never been upgraded
     */
    upgradeSequence: bigint;
}
export interface ChannelProtoMsg {
    typeUrl: '/ibc.core.channel.v1.Channel';
    value: Uint8Array;
}
/**
 * Channel defines pipeline for exactly-once packet delivery between specific
 * modules on separate blockchains, which has at least one end capable of
 * sending packets and one end capable of receiving packets.
 * @name ChannelSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Channel
 */
export interface ChannelSDKType {
    state: State;
    ordering: Order;
    counterparty: CounterpartySDKType;
    connection_hops: string[];
    version: string;
    upgrade_sequence: bigint;
}
/**
 * IdentifiedChannel defines a channel with additional port and channel
 * identifier fields.
 * @name IdentifiedChannel
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.IdentifiedChannel
 */
export interface IdentifiedChannel {
    /**
     * current state of the channel end
     */
    state: State;
    /**
     * whether the channel is ordered or unordered
     */
    ordering: Order;
    /**
     * counterparty channel end
     */
    counterparty: Counterparty;
    /**
     * list of connection identifiers, in order, along which packets sent on
     * this channel will travel
     */
    connectionHops: string[];
    /**
     * opaque channel version, which is agreed upon during the handshake
     */
    version: string;
    /**
     * port identifier
     */
    portId: string;
    /**
     * channel identifier
     */
    channelId: string;
    /**
     * upgrade sequence indicates the latest upgrade attempt performed by this channel
     * the value of 0 indicates the channel has never been upgraded
     */
    upgradeSequence: bigint;
}
export interface IdentifiedChannelProtoMsg {
    typeUrl: '/ibc.core.channel.v1.IdentifiedChannel';
    value: Uint8Array;
}
/**
 * IdentifiedChannel defines a channel with additional port and channel
 * identifier fields.
 * @name IdentifiedChannelSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.IdentifiedChannel
 */
export interface IdentifiedChannelSDKType {
    state: State;
    ordering: Order;
    counterparty: CounterpartySDKType;
    connection_hops: string[];
    version: string;
    port_id: string;
    channel_id: string;
    upgrade_sequence: bigint;
}
/**
 * Counterparty defines a channel end counterparty
 * @name Counterparty
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Counterparty
 */
export interface Counterparty {
    /**
     * port on the counterparty chain which owns the other end of the channel.
     */
    portId: string;
    /**
     * channel end on the counterparty chain
     */
    channelId: string;
}
export interface CounterpartyProtoMsg {
    typeUrl: '/ibc.core.channel.v1.Counterparty';
    value: Uint8Array;
}
/**
 * Counterparty defines a channel end counterparty
 * @name CounterpartySDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Counterparty
 */
export interface CounterpartySDKType {
    port_id: string;
    channel_id: string;
}
/**
 * Packet defines a type that carries data across different chains through IBC
 * @name Packet
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Packet
 */
export interface Packet {
    /**
     * number corresponds to the order of sends and receives, where a Packet
     * with an earlier sequence number must be sent and received before a Packet
     * with a later sequence number.
     */
    sequence: bigint;
    /**
     * identifies the port on the sending chain.
     */
    sourcePort: string;
    /**
     * identifies the channel end on the sending chain.
     */
    sourceChannel: string;
    /**
     * identifies the port on the receiving chain.
     */
    destinationPort: string;
    /**
     * identifies the channel end on the receiving chain.
     */
    destinationChannel: string;
    /**
     * actual opaque bytes transferred directly to the application module
     */
    data: Uint8Array;
    /**
     * block height after which the packet times out
     */
    timeoutHeight: Height;
    /**
     * block timestamp (in nanoseconds) after which the packet times out
     */
    timeoutTimestamp: bigint;
}
export interface PacketProtoMsg {
    typeUrl: '/ibc.core.channel.v1.Packet';
    value: Uint8Array;
}
/**
 * Packet defines a type that carries data across different chains through IBC
 * @name PacketSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Packet
 */
export interface PacketSDKType {
    sequence: bigint;
    source_port: string;
    source_channel: string;
    destination_port: string;
    destination_channel: string;
    data: Uint8Array;
    timeout_height: HeightSDKType;
    timeout_timestamp: bigint;
}
/**
 * PacketState defines the generic type necessary to retrieve and store
 * packet commitments, acknowledgements, and receipts.
 * Caller is responsible for knowing the context necessary to interpret this
 * state as a commitment, acknowledgement, or a receipt.
 * @name PacketState
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketState
 */
export interface PacketState {
    /**
     * channel port identifier.
     */
    portId: string;
    /**
     * channel unique identifier.
     */
    channelId: string;
    /**
     * packet sequence.
     */
    sequence: bigint;
    /**
     * embedded data that represents packet state.
     */
    data: Uint8Array;
}
export interface PacketStateProtoMsg {
    typeUrl: '/ibc.core.channel.v1.PacketState';
    value: Uint8Array;
}
/**
 * PacketState defines the generic type necessary to retrieve and store
 * packet commitments, acknowledgements, and receipts.
 * Caller is responsible for knowing the context necessary to interpret this
 * state as a commitment, acknowledgement, or a receipt.
 * @name PacketStateSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketState
 */
export interface PacketStateSDKType {
    port_id: string;
    channel_id: string;
    sequence: bigint;
    data: Uint8Array;
}
/**
 * PacketId is an identifer for a unique Packet
 * Source chains refer to packets by source port/channel
 * Destination chains refer to packets by destination port/channel
 * @name PacketId
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketId
 */
export interface PacketId {
    /**
     * channel port identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * packet sequence
     */
    sequence: bigint;
}
export interface PacketIdProtoMsg {
    typeUrl: '/ibc.core.channel.v1.PacketId';
    value: Uint8Array;
}
/**
 * PacketId is an identifer for a unique Packet
 * Source chains refer to packets by source port/channel
 * Destination chains refer to packets by destination port/channel
 * @name PacketIdSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketId
 */
export interface PacketIdSDKType {
    port_id: string;
    channel_id: string;
    sequence: bigint;
}
/**
 * Acknowledgement is the recommended acknowledgement format to be used by
 * app-specific protocols.
 * NOTE: The field numbers 21 and 22 were explicitly chosen to avoid accidental
 * conflicts with other protobuf message formats used for acknowledgements.
 * The first byte of any message with this format will be the non-ASCII values
 * `0xaa` (result) or `0xb2` (error). Implemented as defined by ICS:
 * https://github.com/cosmos/ibc/tree/master/spec/core/ics-004-channel-and-packet-semantics#acknowledgement-envelope
 * @name Acknowledgement
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Acknowledgement
 */
export interface Acknowledgement {
    result?: Uint8Array;
    error?: string;
}
export interface AcknowledgementProtoMsg {
    typeUrl: '/ibc.core.channel.v1.Acknowledgement';
    value: Uint8Array;
}
/**
 * Acknowledgement is the recommended acknowledgement format to be used by
 * app-specific protocols.
 * NOTE: The field numbers 21 and 22 were explicitly chosen to avoid accidental
 * conflicts with other protobuf message formats used for acknowledgements.
 * The first byte of any message with this format will be the non-ASCII values
 * `0xaa` (result) or `0xb2` (error). Implemented as defined by ICS:
 * https://github.com/cosmos/ibc/tree/master/spec/core/ics-004-channel-and-packet-semantics#acknowledgement-envelope
 * @name AcknowledgementSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Acknowledgement
 */
export interface AcknowledgementSDKType {
    result?: Uint8Array;
    error?: string;
}
/**
 * Timeout defines an execution deadline structure for 04-channel handlers.
 * This includes packet lifecycle handlers as well as the upgrade handshake handlers.
 * A valid Timeout contains either one or both of a timestamp and block height (sequence).
 * @name Timeout
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Timeout
 */
export interface Timeout {
    /**
     * block height after which the packet or upgrade times out
     */
    height: Height;
    /**
     * block timestamp (in nanoseconds) after which the packet or upgrade times out
     */
    timestamp: bigint;
}
export interface TimeoutProtoMsg {
    typeUrl: '/ibc.core.channel.v1.Timeout';
    value: Uint8Array;
}
/**
 * Timeout defines an execution deadline structure for 04-channel handlers.
 * This includes packet lifecycle handlers as well as the upgrade handshake handlers.
 * A valid Timeout contains either one or both of a timestamp and block height (sequence).
 * @name TimeoutSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Timeout
 */
export interface TimeoutSDKType {
    height: HeightSDKType;
    timestamp: bigint;
}
/**
 * Params defines the set of IBC channel parameters.
 * @name Params
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Params
 */
export interface Params {
    /**
     * the relative timeout after which channel upgrades will time out.
     */
    upgradeTimeout: Timeout;
}
export interface ParamsProtoMsg {
    typeUrl: '/ibc.core.channel.v1.Params';
    value: Uint8Array;
}
/**
 * Params defines the set of IBC channel parameters.
 * @name ParamsSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Params
 */
export interface ParamsSDKType {
    upgrade_timeout: TimeoutSDKType;
}
/**
 * Channel defines pipeline for exactly-once packet delivery between specific
 * modules on separate blockchains, which has at least one end capable of
 * sending packets and one end capable of receiving packets.
 * @name Channel
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Channel
 */
export declare const Channel: {
    typeUrl: "/ibc.core.channel.v1.Channel";
    aminoType: "cosmos-sdk/Channel";
    is(o: any): o is Channel;
    isSDK(o: any): o is ChannelSDKType;
    encode(message: Channel, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Channel;
    fromJSON(object: any): Channel;
    toJSON(message: Channel): JsonSafe<Channel>;
    fromPartial(object: Partial<Channel>): Channel;
    fromProtoMsg(message: ChannelProtoMsg): Channel;
    toProto(message: Channel): Uint8Array;
    toProtoMsg(message: Channel): ChannelProtoMsg;
    registerTypeUrl(): void;
};
/**
 * IdentifiedChannel defines a channel with additional port and channel
 * identifier fields.
 * @name IdentifiedChannel
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.IdentifiedChannel
 */
export declare const IdentifiedChannel: {
    typeUrl: "/ibc.core.channel.v1.IdentifiedChannel";
    aminoType: "cosmos-sdk/IdentifiedChannel";
    is(o: any): o is IdentifiedChannel;
    isSDK(o: any): o is IdentifiedChannelSDKType;
    encode(message: IdentifiedChannel, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): IdentifiedChannel;
    fromJSON(object: any): IdentifiedChannel;
    toJSON(message: IdentifiedChannel): JsonSafe<IdentifiedChannel>;
    fromPartial(object: Partial<IdentifiedChannel>): IdentifiedChannel;
    fromProtoMsg(message: IdentifiedChannelProtoMsg): IdentifiedChannel;
    toProto(message: IdentifiedChannel): Uint8Array;
    toProtoMsg(message: IdentifiedChannel): IdentifiedChannelProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Counterparty defines a channel end counterparty
 * @name Counterparty
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Counterparty
 */
export declare const Counterparty: {
    typeUrl: "/ibc.core.channel.v1.Counterparty";
    aminoType: "cosmos-sdk/Counterparty";
    is(o: any): o is Counterparty;
    isSDK(o: any): o is CounterpartySDKType;
    encode(message: Counterparty, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Counterparty;
    fromJSON(object: any): Counterparty;
    toJSON(message: Counterparty): JsonSafe<Counterparty>;
    fromPartial(object: Partial<Counterparty>): Counterparty;
    fromProtoMsg(message: CounterpartyProtoMsg): Counterparty;
    toProto(message: Counterparty): Uint8Array;
    toProtoMsg(message: Counterparty): CounterpartyProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Packet defines a type that carries data across different chains through IBC
 * @name Packet
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Packet
 */
export declare const Packet: {
    typeUrl: "/ibc.core.channel.v1.Packet";
    aminoType: "cosmos-sdk/Packet";
    is(o: any): o is Packet;
    isSDK(o: any): o is PacketSDKType;
    encode(message: Packet, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Packet;
    fromJSON(object: any): Packet;
    toJSON(message: Packet): JsonSafe<Packet>;
    fromPartial(object: Partial<Packet>): Packet;
    fromProtoMsg(message: PacketProtoMsg): Packet;
    toProto(message: Packet): Uint8Array;
    toProtoMsg(message: Packet): PacketProtoMsg;
    registerTypeUrl(): void;
};
/**
 * PacketState defines the generic type necessary to retrieve and store
 * packet commitments, acknowledgements, and receipts.
 * Caller is responsible for knowing the context necessary to interpret this
 * state as a commitment, acknowledgement, or a receipt.
 * @name PacketState
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketState
 */
export declare const PacketState: {
    typeUrl: "/ibc.core.channel.v1.PacketState";
    aminoType: "cosmos-sdk/PacketState";
    is(o: any): o is PacketState;
    isSDK(o: any): o is PacketStateSDKType;
    encode(message: PacketState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PacketState;
    fromJSON(object: any): PacketState;
    toJSON(message: PacketState): JsonSafe<PacketState>;
    fromPartial(object: Partial<PacketState>): PacketState;
    fromProtoMsg(message: PacketStateProtoMsg): PacketState;
    toProto(message: PacketState): Uint8Array;
    toProtoMsg(message: PacketState): PacketStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * PacketId is an identifer for a unique Packet
 * Source chains refer to packets by source port/channel
 * Destination chains refer to packets by destination port/channel
 * @name PacketId
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketId
 */
export declare const PacketId: {
    typeUrl: "/ibc.core.channel.v1.PacketId";
    aminoType: "cosmos-sdk/PacketId";
    is(o: any): o is PacketId;
    isSDK(o: any): o is PacketIdSDKType;
    encode(message: PacketId, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PacketId;
    fromJSON(object: any): PacketId;
    toJSON(message: PacketId): JsonSafe<PacketId>;
    fromPartial(object: Partial<PacketId>): PacketId;
    fromProtoMsg(message: PacketIdProtoMsg): PacketId;
    toProto(message: PacketId): Uint8Array;
    toProtoMsg(message: PacketId): PacketIdProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Acknowledgement is the recommended acknowledgement format to be used by
 * app-specific protocols.
 * NOTE: The field numbers 21 and 22 were explicitly chosen to avoid accidental
 * conflicts with other protobuf message formats used for acknowledgements.
 * The first byte of any message with this format will be the non-ASCII values
 * `0xaa` (result) or `0xb2` (error). Implemented as defined by ICS:
 * https://github.com/cosmos/ibc/tree/master/spec/core/ics-004-channel-and-packet-semantics#acknowledgement-envelope
 * @name Acknowledgement
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Acknowledgement
 */
export declare const Acknowledgement: {
    typeUrl: "/ibc.core.channel.v1.Acknowledgement";
    aminoType: "cosmos-sdk/Acknowledgement";
    is(o: any): o is Acknowledgement;
    isSDK(o: any): o is AcknowledgementSDKType;
    encode(message: Acknowledgement, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Acknowledgement;
    fromJSON(object: any): Acknowledgement;
    toJSON(message: Acknowledgement): JsonSafe<Acknowledgement>;
    fromPartial(object: Partial<Acknowledgement>): Acknowledgement;
    fromProtoMsg(message: AcknowledgementProtoMsg): Acknowledgement;
    toProto(message: Acknowledgement): Uint8Array;
    toProtoMsg(message: Acknowledgement): AcknowledgementProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Timeout defines an execution deadline structure for 04-channel handlers.
 * This includes packet lifecycle handlers as well as the upgrade handshake handlers.
 * A valid Timeout contains either one or both of a timestamp and block height (sequence).
 * @name Timeout
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Timeout
 */
export declare const Timeout: {
    typeUrl: "/ibc.core.channel.v1.Timeout";
    aminoType: "cosmos-sdk/Timeout";
    is(o: any): o is Timeout;
    isSDK(o: any): o is TimeoutSDKType;
    encode(message: Timeout, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Timeout;
    fromJSON(object: any): Timeout;
    toJSON(message: Timeout): JsonSafe<Timeout>;
    fromPartial(object: Partial<Timeout>): Timeout;
    fromProtoMsg(message: TimeoutProtoMsg): Timeout;
    toProto(message: Timeout): Uint8Array;
    toProtoMsg(message: Timeout): TimeoutProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Params defines the set of IBC channel parameters.
 * @name Params
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Params
 */
export declare const Params: {
    typeUrl: "/ibc.core.channel.v1.Params";
    aminoType: "cosmos-sdk/Params";
    is(o: any): o is Params;
    isSDK(o: any): o is ParamsSDKType;
    encode(message: Params, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Params;
    fromJSON(object: any): Params;
    toJSON(message: Params): JsonSafe<Params>;
    fromPartial(object: Partial<Params>): Params;
    fromProtoMsg(message: ParamsProtoMsg): Params;
    toProto(message: Params): Uint8Array;
    toProtoMsg(message: Params): ParamsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=channel.d.ts.map