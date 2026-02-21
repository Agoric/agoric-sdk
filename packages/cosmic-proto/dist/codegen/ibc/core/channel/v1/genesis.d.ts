import { IdentifiedChannel, type IdentifiedChannelSDKType, PacketState, type PacketStateSDKType, Params, type ParamsSDKType } from './channel.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * GenesisState defines the ibc channel submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.GenesisState
 */
export interface GenesisState {
    channels: IdentifiedChannel[];
    acknowledgements: PacketState[];
    commitments: PacketState[];
    receipts: PacketState[];
    sendSequences: PacketSequence[];
    recvSequences: PacketSequence[];
    ackSequences: PacketSequence[];
    /**
     * the sequence for the next generated channel identifier
     */
    nextChannelSequence: bigint;
    params: Params;
}
export interface GenesisStateProtoMsg {
    typeUrl: '/ibc.core.channel.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the ibc channel submodule's genesis state.
 * @name GenesisStateSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.GenesisState
 */
export interface GenesisStateSDKType {
    channels: IdentifiedChannelSDKType[];
    acknowledgements: PacketStateSDKType[];
    commitments: PacketStateSDKType[];
    receipts: PacketStateSDKType[];
    send_sequences: PacketSequenceSDKType[];
    recv_sequences: PacketSequenceSDKType[];
    ack_sequences: PacketSequenceSDKType[];
    next_channel_sequence: bigint;
    params: ParamsSDKType;
}
/**
 * PacketSequence defines the genesis type necessary to retrieve and store
 * next send and receive sequences.
 * @name PacketSequence
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketSequence
 */
export interface PacketSequence {
    portId: string;
    channelId: string;
    sequence: bigint;
}
export interface PacketSequenceProtoMsg {
    typeUrl: '/ibc.core.channel.v1.PacketSequence';
    value: Uint8Array;
}
/**
 * PacketSequence defines the genesis type necessary to retrieve and store
 * next send and receive sequences.
 * @name PacketSequenceSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketSequence
 */
export interface PacketSequenceSDKType {
    port_id: string;
    channel_id: string;
    sequence: bigint;
}
/**
 * GenesisState defines the ibc channel submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/ibc.core.channel.v1.GenesisState";
    aminoType: "cosmos-sdk/GenesisState";
    is(o: any): o is GenesisState;
    isSDK(o: any): o is GenesisStateSDKType;
    encode(message: GenesisState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GenesisState;
    fromJSON(object: any): GenesisState;
    toJSON(message: GenesisState): JsonSafe<GenesisState>;
    fromPartial(object: Partial<GenesisState>): GenesisState;
    fromProtoMsg(message: GenesisStateProtoMsg): GenesisState;
    toProto(message: GenesisState): Uint8Array;
    toProtoMsg(message: GenesisState): GenesisStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * PacketSequence defines the genesis type necessary to retrieve and store
 * next send and receive sequences.
 * @name PacketSequence
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.PacketSequence
 */
export declare const PacketSequence: {
    typeUrl: "/ibc.core.channel.v1.PacketSequence";
    aminoType: "cosmos-sdk/PacketSequence";
    is(o: any): o is PacketSequence;
    isSDK(o: any): o is PacketSequenceSDKType;
    encode(message: PacketSequence, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PacketSequence;
    fromJSON(object: any): PacketSequence;
    toJSON(message: PacketSequence): JsonSafe<PacketSequence>;
    fromPartial(object: Partial<PacketSequence>): PacketSequence;
    fromProtoMsg(message: PacketSequenceProtoMsg): PacketSequence;
    toProto(message: PacketSequence): Uint8Array;
    toProtoMsg(message: PacketSequence): PacketSequenceProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map