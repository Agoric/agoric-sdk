import { Height, type HeightSDKType } from '../../../core/client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Wasm light client's Client state
 * @name ClientState
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ClientState
 */
export interface ClientState {
    /**
     * bytes encoding the client state of the underlying light client
     * implemented as a Wasm contract.
     */
    data: Uint8Array;
    checksum: Uint8Array;
    latestHeight: Height;
}
export interface ClientStateProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.ClientState';
    value: Uint8Array;
}
/**
 * Wasm light client's Client state
 * @name ClientStateSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ClientState
 */
export interface ClientStateSDKType {
    data: Uint8Array;
    checksum: Uint8Array;
    latest_height: HeightSDKType;
}
/**
 * Wasm light client's ConsensusState
 * @name ConsensusState
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ConsensusState
 */
export interface ConsensusState {
    /**
     * bytes encoding the consensus state of the underlying light client
     * implemented as a Wasm contract.
     */
    data: Uint8Array;
}
export interface ConsensusStateProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.ConsensusState';
    value: Uint8Array;
}
/**
 * Wasm light client's ConsensusState
 * @name ConsensusStateSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ConsensusState
 */
export interface ConsensusStateSDKType {
    data: Uint8Array;
}
/**
 * Wasm light client message (either header(s) or misbehaviour)
 * @name ClientMessage
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ClientMessage
 */
export interface ClientMessage {
    data: Uint8Array;
}
export interface ClientMessageProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.ClientMessage';
    value: Uint8Array;
}
/**
 * Wasm light client message (either header(s) or misbehaviour)
 * @name ClientMessageSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ClientMessage
 */
export interface ClientMessageSDKType {
    data: Uint8Array;
}
/**
 * Checksums defines a list of all checksums that are stored
 *
 * Deprecated: This message is deprecated in favor of storing the checksums
 * using a Collections.KeySet.
 * @name Checksums
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.Checksums
 * @deprecated
 */
export interface Checksums {
    checksums: Uint8Array[];
}
export interface ChecksumsProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.Checksums';
    value: Uint8Array;
}
/**
 * Checksums defines a list of all checksums that are stored
 *
 * Deprecated: This message is deprecated in favor of storing the checksums
 * using a Collections.KeySet.
 * @name ChecksumsSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.Checksums
 * @deprecated
 */
export interface ChecksumsSDKType {
    checksums: Uint8Array[];
}
/**
 * Wasm light client's Client state
 * @name ClientState
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ClientState
 */
export declare const ClientState: {
    typeUrl: "/ibc.lightclients.wasm.v1.ClientState";
    aminoType: "cosmos-sdk/ClientState";
    is(o: any): o is ClientState;
    isSDK(o: any): o is ClientStateSDKType;
    encode(message: ClientState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ClientState;
    fromJSON(object: any): ClientState;
    toJSON(message: ClientState): JsonSafe<ClientState>;
    fromPartial(object: Partial<ClientState>): ClientState;
    fromProtoMsg(message: ClientStateProtoMsg): ClientState;
    toProto(message: ClientState): Uint8Array;
    toProtoMsg(message: ClientState): ClientStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Wasm light client's ConsensusState
 * @name ConsensusState
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ConsensusState
 */
export declare const ConsensusState: {
    typeUrl: "/ibc.lightclients.wasm.v1.ConsensusState";
    aminoType: "cosmos-sdk/ConsensusState";
    is(o: any): o is ConsensusState;
    isSDK(o: any): o is ConsensusStateSDKType;
    encode(message: ConsensusState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConsensusState;
    fromJSON(object: any): ConsensusState;
    toJSON(message: ConsensusState): JsonSafe<ConsensusState>;
    fromPartial(object: Partial<ConsensusState>): ConsensusState;
    fromProtoMsg(message: ConsensusStateProtoMsg): ConsensusState;
    toProto(message: ConsensusState): Uint8Array;
    toProtoMsg(message: ConsensusState): ConsensusStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Wasm light client message (either header(s) or misbehaviour)
 * @name ClientMessage
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.ClientMessage
 */
export declare const ClientMessage: {
    typeUrl: "/ibc.lightclients.wasm.v1.ClientMessage";
    aminoType: "cosmos-sdk/ClientMessage";
    is(o: any): o is ClientMessage;
    isSDK(o: any): o is ClientMessageSDKType;
    encode(message: ClientMessage, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ClientMessage;
    fromJSON(object: any): ClientMessage;
    toJSON(message: ClientMessage): JsonSafe<ClientMessage>;
    fromPartial(object: Partial<ClientMessage>): ClientMessage;
    fromProtoMsg(message: ClientMessageProtoMsg): ClientMessage;
    toProto(message: ClientMessage): Uint8Array;
    toProtoMsg(message: ClientMessage): ClientMessageProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Checksums defines a list of all checksums that are stored
 *
 * Deprecated: This message is deprecated in favor of storing the checksums
 * using a Collections.KeySet.
 * @name Checksums
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.Checksums
 * @deprecated
 */
export declare const Checksums: {
    typeUrl: "/ibc.lightclients.wasm.v1.Checksums";
    aminoType: "cosmos-sdk/Checksums";
    is(o: any): o is Checksums;
    isSDK(o: any): o is ChecksumsSDKType;
    encode(message: Checksums, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Checksums;
    fromJSON(object: any): Checksums;
    toJSON(message: Checksums): JsonSafe<Checksums>;
    fromPartial(object: Partial<Checksums>): Checksums;
    fromProtoMsg(message: ChecksumsProtoMsg): Checksums;
    toProto(message: Checksums): Uint8Array;
    toProtoMsg(message: Checksums): ChecksumsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=wasm.d.ts.map