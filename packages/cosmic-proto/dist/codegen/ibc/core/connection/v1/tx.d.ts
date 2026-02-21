import { Counterparty, type CounterpartySDKType, Version, type VersionSDKType } from './connection.js';
import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { Height, type HeightSDKType, Params, type ParamsSDKType } from '../../client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * MsgConnectionOpenInit defines the msg sent by an account on Chain A to
 * initialize a connection with Chain B.
 * @name MsgConnectionOpenInit
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInit
 */
export interface MsgConnectionOpenInit {
    clientId: string;
    counterparty: Counterparty;
    version?: Version;
    delayPeriod: bigint;
    signer: string;
}
export interface MsgConnectionOpenInitProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenInit';
    value: Uint8Array;
}
/**
 * MsgConnectionOpenInit defines the msg sent by an account on Chain A to
 * initialize a connection with Chain B.
 * @name MsgConnectionOpenInitSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInit
 */
export interface MsgConnectionOpenInitSDKType {
    client_id: string;
    counterparty: CounterpartySDKType;
    version?: VersionSDKType;
    delay_period: bigint;
    signer: string;
}
/**
 * MsgConnectionOpenInitResponse defines the Msg/ConnectionOpenInit response
 * type.
 * @name MsgConnectionOpenInitResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInitResponse
 */
export interface MsgConnectionOpenInitResponse {
}
export interface MsgConnectionOpenInitResponseProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenInitResponse';
    value: Uint8Array;
}
/**
 * MsgConnectionOpenInitResponse defines the Msg/ConnectionOpenInit response
 * type.
 * @name MsgConnectionOpenInitResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInitResponse
 */
export interface MsgConnectionOpenInitResponseSDKType {
}
/**
 * MsgConnectionOpenTry defines a msg sent by a Relayer to try to open a
 * connection on Chain B.
 * @name MsgConnectionOpenTry
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTry
 */
export interface MsgConnectionOpenTry {
    clientId: string;
    /**
     * Deprecated: this field is unused. Crossing hellos are no longer supported in core IBC.
     * @deprecated
     */
    previousConnectionId: string;
    /**
     * @deprecated
     */
    clientState?: Any;
    counterparty: Counterparty;
    delayPeriod: bigint;
    counterpartyVersions: Version[];
    proofHeight: Height;
    /**
     * proof of the initialization the connection on Chain A: `UNITIALIZED ->
     * INIT`
     */
    proofInit: Uint8Array;
    /**
     * proof of client state included in message
     * @deprecated
     */
    proofClient: Uint8Array;
    /**
     * proof of client consensus state
     * @deprecated
     */
    proofConsensus: Uint8Array;
    /**
     * @deprecated
     */
    consensusHeight: Height;
    signer: string;
    /**
     * optional proof data for host state machines that are unable to introspect their own consensus state
     * @deprecated
     */
    hostConsensusStateProof: Uint8Array;
}
export interface MsgConnectionOpenTryProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenTry';
    value: Uint8Array;
}
/**
 * MsgConnectionOpenTry defines a msg sent by a Relayer to try to open a
 * connection on Chain B.
 * @name MsgConnectionOpenTrySDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTry
 */
export interface MsgConnectionOpenTrySDKType {
    client_id: string;
    /**
     * @deprecated
     */
    previous_connection_id: string;
    /**
     * @deprecated
     */
    client_state?: AnySDKType;
    counterparty: CounterpartySDKType;
    delay_period: bigint;
    counterparty_versions: VersionSDKType[];
    proof_height: HeightSDKType;
    proof_init: Uint8Array;
    /**
     * @deprecated
     */
    proof_client: Uint8Array;
    /**
     * @deprecated
     */
    proof_consensus: Uint8Array;
    /**
     * @deprecated
     */
    consensus_height: HeightSDKType;
    signer: string;
    /**
     * @deprecated
     */
    host_consensus_state_proof: Uint8Array;
}
/**
 * MsgConnectionOpenTryResponse defines the Msg/ConnectionOpenTry response type.
 * @name MsgConnectionOpenTryResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTryResponse
 */
export interface MsgConnectionOpenTryResponse {
}
export interface MsgConnectionOpenTryResponseProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenTryResponse';
    value: Uint8Array;
}
/**
 * MsgConnectionOpenTryResponse defines the Msg/ConnectionOpenTry response type.
 * @name MsgConnectionOpenTryResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTryResponse
 */
export interface MsgConnectionOpenTryResponseSDKType {
}
/**
 * MsgConnectionOpenAck defines a msg sent by a Relayer to Chain A to
 * acknowledge the change of connection state to TRYOPEN on Chain B.
 * @name MsgConnectionOpenAck
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAck
 */
export interface MsgConnectionOpenAck {
    connectionId: string;
    counterpartyConnectionId: string;
    version?: Version;
    /**
     * @deprecated
     */
    clientState?: Any;
    proofHeight: Height;
    /**
     * proof of the initialization the connection on Chain B: `UNITIALIZED ->
     * TRYOPEN`
     */
    proofTry: Uint8Array;
    /**
     * proof of client state included in message
     * @deprecated
     */
    proofClient: Uint8Array;
    /**
     * proof of client consensus state
     * @deprecated
     */
    proofConsensus: Uint8Array;
    /**
     * @deprecated
     */
    consensusHeight: Height;
    signer: string;
    /**
     * optional proof data for host state machines that are unable to introspect their own consensus state
     * @deprecated
     */
    hostConsensusStateProof: Uint8Array;
}
export interface MsgConnectionOpenAckProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenAck';
    value: Uint8Array;
}
/**
 * MsgConnectionOpenAck defines a msg sent by a Relayer to Chain A to
 * acknowledge the change of connection state to TRYOPEN on Chain B.
 * @name MsgConnectionOpenAckSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAck
 */
export interface MsgConnectionOpenAckSDKType {
    connection_id: string;
    counterparty_connection_id: string;
    version?: VersionSDKType;
    /**
     * @deprecated
     */
    client_state?: AnySDKType;
    proof_height: HeightSDKType;
    proof_try: Uint8Array;
    /**
     * @deprecated
     */
    proof_client: Uint8Array;
    /**
     * @deprecated
     */
    proof_consensus: Uint8Array;
    /**
     * @deprecated
     */
    consensus_height: HeightSDKType;
    signer: string;
    /**
     * @deprecated
     */
    host_consensus_state_proof: Uint8Array;
}
/**
 * MsgConnectionOpenAckResponse defines the Msg/ConnectionOpenAck response type.
 * @name MsgConnectionOpenAckResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAckResponse
 */
export interface MsgConnectionOpenAckResponse {
}
export interface MsgConnectionOpenAckResponseProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenAckResponse';
    value: Uint8Array;
}
/**
 * MsgConnectionOpenAckResponse defines the Msg/ConnectionOpenAck response type.
 * @name MsgConnectionOpenAckResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAckResponse
 */
export interface MsgConnectionOpenAckResponseSDKType {
}
/**
 * MsgConnectionOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of connection state to OPEN on Chain A.
 * @name MsgConnectionOpenConfirm
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirm
 */
export interface MsgConnectionOpenConfirm {
    connectionId: string;
    /**
     * proof for the change of the connection state on Chain A: `INIT -> OPEN`
     */
    proofAck: Uint8Array;
    proofHeight: Height;
    signer: string;
}
export interface MsgConnectionOpenConfirmProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenConfirm';
    value: Uint8Array;
}
/**
 * MsgConnectionOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of connection state to OPEN on Chain A.
 * @name MsgConnectionOpenConfirmSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirm
 */
export interface MsgConnectionOpenConfirmSDKType {
    connection_id: string;
    proof_ack: Uint8Array;
    proof_height: HeightSDKType;
    signer: string;
}
/**
 * MsgConnectionOpenConfirmResponse defines the Msg/ConnectionOpenConfirm
 * response type.
 * @name MsgConnectionOpenConfirmResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirmResponse
 */
export interface MsgConnectionOpenConfirmResponse {
}
export interface MsgConnectionOpenConfirmResponseProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenConfirmResponse';
    value: Uint8Array;
}
/**
 * MsgConnectionOpenConfirmResponse defines the Msg/ConnectionOpenConfirm
 * response type.
 * @name MsgConnectionOpenConfirmResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirmResponse
 */
export interface MsgConnectionOpenConfirmResponseSDKType {
}
/**
 * MsgUpdateParams defines the sdk.Msg type to update the connection parameters.
 * @name MsgUpdateParams
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * signer address
     */
    signer: string;
    /**
     * params defines the connection parameters to update.
     *
     * NOTE: All parameters must be supplied.
     */
    params: Params;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams defines the sdk.Msg type to update the connection parameters.
 * @name MsgUpdateParamsSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
    signer: string;
    params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/ibc.core.connection.v1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgConnectionOpenInit defines the msg sent by an account on Chain A to
 * initialize a connection with Chain B.
 * @name MsgConnectionOpenInit
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInit
 */
export declare const MsgConnectionOpenInit: {
    typeUrl: "/ibc.core.connection.v1.MsgConnectionOpenInit";
    aminoType: "cosmos-sdk/MsgConnectionOpenInit";
    is(o: any): o is MsgConnectionOpenInit;
    isSDK(o: any): o is MsgConnectionOpenInitSDKType;
    encode(message: MsgConnectionOpenInit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConnectionOpenInit;
    fromJSON(object: any): MsgConnectionOpenInit;
    toJSON(message: MsgConnectionOpenInit): JsonSafe<MsgConnectionOpenInit>;
    fromPartial(object: Partial<MsgConnectionOpenInit>): MsgConnectionOpenInit;
    fromProtoMsg(message: MsgConnectionOpenInitProtoMsg): MsgConnectionOpenInit;
    toProto(message: MsgConnectionOpenInit): Uint8Array;
    toProtoMsg(message: MsgConnectionOpenInit): MsgConnectionOpenInitProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgConnectionOpenInitResponse defines the Msg/ConnectionOpenInit response
 * type.
 * @name MsgConnectionOpenInitResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInitResponse
 */
export declare const MsgConnectionOpenInitResponse: {
    typeUrl: "/ibc.core.connection.v1.MsgConnectionOpenInitResponse";
    aminoType: "cosmos-sdk/MsgConnectionOpenInitResponse";
    is(o: any): o is MsgConnectionOpenInitResponse;
    isSDK(o: any): o is MsgConnectionOpenInitResponseSDKType;
    encode(_: MsgConnectionOpenInitResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConnectionOpenInitResponse;
    fromJSON(_: any): MsgConnectionOpenInitResponse;
    toJSON(_: MsgConnectionOpenInitResponse): JsonSafe<MsgConnectionOpenInitResponse>;
    fromPartial(_: Partial<MsgConnectionOpenInitResponse>): MsgConnectionOpenInitResponse;
    fromProtoMsg(message: MsgConnectionOpenInitResponseProtoMsg): MsgConnectionOpenInitResponse;
    toProto(message: MsgConnectionOpenInitResponse): Uint8Array;
    toProtoMsg(message: MsgConnectionOpenInitResponse): MsgConnectionOpenInitResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgConnectionOpenTry defines a msg sent by a Relayer to try to open a
 * connection on Chain B.
 * @name MsgConnectionOpenTry
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTry
 */
export declare const MsgConnectionOpenTry: {
    typeUrl: "/ibc.core.connection.v1.MsgConnectionOpenTry";
    aminoType: "cosmos-sdk/MsgConnectionOpenTry";
    is(o: any): o is MsgConnectionOpenTry;
    isSDK(o: any): o is MsgConnectionOpenTrySDKType;
    encode(message: MsgConnectionOpenTry, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConnectionOpenTry;
    fromJSON(object: any): MsgConnectionOpenTry;
    toJSON(message: MsgConnectionOpenTry): JsonSafe<MsgConnectionOpenTry>;
    fromPartial(object: Partial<MsgConnectionOpenTry>): MsgConnectionOpenTry;
    fromProtoMsg(message: MsgConnectionOpenTryProtoMsg): MsgConnectionOpenTry;
    toProto(message: MsgConnectionOpenTry): Uint8Array;
    toProtoMsg(message: MsgConnectionOpenTry): MsgConnectionOpenTryProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgConnectionOpenTryResponse defines the Msg/ConnectionOpenTry response type.
 * @name MsgConnectionOpenTryResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTryResponse
 */
export declare const MsgConnectionOpenTryResponse: {
    typeUrl: "/ibc.core.connection.v1.MsgConnectionOpenTryResponse";
    aminoType: "cosmos-sdk/MsgConnectionOpenTryResponse";
    is(o: any): o is MsgConnectionOpenTryResponse;
    isSDK(o: any): o is MsgConnectionOpenTryResponseSDKType;
    encode(_: MsgConnectionOpenTryResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConnectionOpenTryResponse;
    fromJSON(_: any): MsgConnectionOpenTryResponse;
    toJSON(_: MsgConnectionOpenTryResponse): JsonSafe<MsgConnectionOpenTryResponse>;
    fromPartial(_: Partial<MsgConnectionOpenTryResponse>): MsgConnectionOpenTryResponse;
    fromProtoMsg(message: MsgConnectionOpenTryResponseProtoMsg): MsgConnectionOpenTryResponse;
    toProto(message: MsgConnectionOpenTryResponse): Uint8Array;
    toProtoMsg(message: MsgConnectionOpenTryResponse): MsgConnectionOpenTryResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgConnectionOpenAck defines a msg sent by a Relayer to Chain A to
 * acknowledge the change of connection state to TRYOPEN on Chain B.
 * @name MsgConnectionOpenAck
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAck
 */
export declare const MsgConnectionOpenAck: {
    typeUrl: "/ibc.core.connection.v1.MsgConnectionOpenAck";
    aminoType: "cosmos-sdk/MsgConnectionOpenAck";
    is(o: any): o is MsgConnectionOpenAck;
    isSDK(o: any): o is MsgConnectionOpenAckSDKType;
    encode(message: MsgConnectionOpenAck, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConnectionOpenAck;
    fromJSON(object: any): MsgConnectionOpenAck;
    toJSON(message: MsgConnectionOpenAck): JsonSafe<MsgConnectionOpenAck>;
    fromPartial(object: Partial<MsgConnectionOpenAck>): MsgConnectionOpenAck;
    fromProtoMsg(message: MsgConnectionOpenAckProtoMsg): MsgConnectionOpenAck;
    toProto(message: MsgConnectionOpenAck): Uint8Array;
    toProtoMsg(message: MsgConnectionOpenAck): MsgConnectionOpenAckProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgConnectionOpenAckResponse defines the Msg/ConnectionOpenAck response type.
 * @name MsgConnectionOpenAckResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAckResponse
 */
export declare const MsgConnectionOpenAckResponse: {
    typeUrl: "/ibc.core.connection.v1.MsgConnectionOpenAckResponse";
    aminoType: "cosmos-sdk/MsgConnectionOpenAckResponse";
    is(o: any): o is MsgConnectionOpenAckResponse;
    isSDK(o: any): o is MsgConnectionOpenAckResponseSDKType;
    encode(_: MsgConnectionOpenAckResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConnectionOpenAckResponse;
    fromJSON(_: any): MsgConnectionOpenAckResponse;
    toJSON(_: MsgConnectionOpenAckResponse): JsonSafe<MsgConnectionOpenAckResponse>;
    fromPartial(_: Partial<MsgConnectionOpenAckResponse>): MsgConnectionOpenAckResponse;
    fromProtoMsg(message: MsgConnectionOpenAckResponseProtoMsg): MsgConnectionOpenAckResponse;
    toProto(message: MsgConnectionOpenAckResponse): Uint8Array;
    toProtoMsg(message: MsgConnectionOpenAckResponse): MsgConnectionOpenAckResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgConnectionOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of connection state to OPEN on Chain A.
 * @name MsgConnectionOpenConfirm
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirm
 */
export declare const MsgConnectionOpenConfirm: {
    typeUrl: "/ibc.core.connection.v1.MsgConnectionOpenConfirm";
    aminoType: "cosmos-sdk/MsgConnectionOpenConfirm";
    is(o: any): o is MsgConnectionOpenConfirm;
    isSDK(o: any): o is MsgConnectionOpenConfirmSDKType;
    encode(message: MsgConnectionOpenConfirm, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConnectionOpenConfirm;
    fromJSON(object: any): MsgConnectionOpenConfirm;
    toJSON(message: MsgConnectionOpenConfirm): JsonSafe<MsgConnectionOpenConfirm>;
    fromPartial(object: Partial<MsgConnectionOpenConfirm>): MsgConnectionOpenConfirm;
    fromProtoMsg(message: MsgConnectionOpenConfirmProtoMsg): MsgConnectionOpenConfirm;
    toProto(message: MsgConnectionOpenConfirm): Uint8Array;
    toProtoMsg(message: MsgConnectionOpenConfirm): MsgConnectionOpenConfirmProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgConnectionOpenConfirmResponse defines the Msg/ConnectionOpenConfirm
 * response type.
 * @name MsgConnectionOpenConfirmResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirmResponse
 */
export declare const MsgConnectionOpenConfirmResponse: {
    typeUrl: "/ibc.core.connection.v1.MsgConnectionOpenConfirmResponse";
    aminoType: "cosmos-sdk/MsgConnectionOpenConfirmResponse";
    is(o: any): o is MsgConnectionOpenConfirmResponse;
    isSDK(o: any): o is MsgConnectionOpenConfirmResponseSDKType;
    encode(_: MsgConnectionOpenConfirmResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConnectionOpenConfirmResponse;
    fromJSON(_: any): MsgConnectionOpenConfirmResponse;
    toJSON(_: MsgConnectionOpenConfirmResponse): JsonSafe<MsgConnectionOpenConfirmResponse>;
    fromPartial(_: Partial<MsgConnectionOpenConfirmResponse>): MsgConnectionOpenConfirmResponse;
    fromProtoMsg(message: MsgConnectionOpenConfirmResponseProtoMsg): MsgConnectionOpenConfirmResponse;
    toProto(message: MsgConnectionOpenConfirmResponse): Uint8Array;
    toProtoMsg(message: MsgConnectionOpenConfirmResponse): MsgConnectionOpenConfirmResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams defines the sdk.Msg type to update the connection parameters.
 * @name MsgUpdateParams
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/ibc.core.connection.v1.MsgUpdateParams";
    aminoType: "cosmos-sdk/MsgUpdateParams";
    is(o: any): o is MsgUpdateParams;
    isSDK(o: any): o is MsgUpdateParamsSDKType;
    encode(message: MsgUpdateParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParams;
    fromJSON(object: any): MsgUpdateParams;
    toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams>;
    fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams;
    fromProtoMsg(message: MsgUpdateParamsProtoMsg): MsgUpdateParams;
    toProto(message: MsgUpdateParams): Uint8Array;
    toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/ibc.core.connection.v1.MsgUpdateParamsResponse";
    aminoType: "cosmos-sdk/MsgUpdateParamsResponse";
    is(o: any): o is MsgUpdateParamsResponse;
    isSDK(o: any): o is MsgUpdateParamsResponseSDKType;
    encode(_: MsgUpdateParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParamsResponse;
    fromJSON(_: any): MsgUpdateParamsResponse;
    toJSON(_: MsgUpdateParamsResponse): JsonSafe<MsgUpdateParamsResponse>;
    fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse;
    fromProtoMsg(message: MsgUpdateParamsResponseProtoMsg): MsgUpdateParamsResponse;
    toProto(message: MsgUpdateParamsResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateParamsResponse): MsgUpdateParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map