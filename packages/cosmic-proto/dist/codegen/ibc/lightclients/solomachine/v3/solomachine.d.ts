import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * ClientState defines a solo machine client that tracks the current consensus
 * state and if the client is frozen.
 * @name ClientState
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.ClientState
 */
export interface ClientState {
    /**
     * latest sequence of the client state
     */
    sequence: bigint;
    /**
     * frozen sequence of the solo machine
     */
    isFrozen: boolean;
    consensusState?: ConsensusState;
}
export interface ClientStateProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v3.ClientState';
    value: Uint8Array;
}
/**
 * ClientState defines a solo machine client that tracks the current consensus
 * state and if the client is frozen.
 * @name ClientStateSDKType
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.ClientState
 */
export interface ClientStateSDKType {
    sequence: bigint;
    is_frozen: boolean;
    consensus_state?: ConsensusStateSDKType;
}
/**
 * ConsensusState defines a solo machine consensus state. The sequence of a
 * consensus state is contained in the "height" key used in storing the
 * consensus state.
 * @name ConsensusState
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.ConsensusState
 */
export interface ConsensusState {
    /**
     * public key of the solo machine
     */
    publicKey?: Any;
    /**
     * diversifier allows the same public key to be re-used across different solo
     * machine clients (potentially on different chains) without being considered
     * misbehaviour.
     */
    diversifier: string;
    timestamp: bigint;
}
export interface ConsensusStateProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v3.ConsensusState';
    value: Uint8Array;
}
/**
 * ConsensusState defines a solo machine consensus state. The sequence of a
 * consensus state is contained in the "height" key used in storing the
 * consensus state.
 * @name ConsensusStateSDKType
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.ConsensusState
 */
export interface ConsensusStateSDKType {
    public_key?: AnySDKType;
    diversifier: string;
    timestamp: bigint;
}
/**
 * Header defines a solo machine consensus header
 * @name Header
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.Header
 */
export interface Header {
    timestamp: bigint;
    signature: Uint8Array;
    newPublicKey?: Any;
    newDiversifier: string;
}
export interface HeaderProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v3.Header';
    value: Uint8Array;
}
/**
 * Header defines a solo machine consensus header
 * @name HeaderSDKType
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.Header
 */
export interface HeaderSDKType {
    timestamp: bigint;
    signature: Uint8Array;
    new_public_key?: AnySDKType;
    new_diversifier: string;
}
/**
 * Misbehaviour defines misbehaviour for a solo machine which consists
 * of a sequence and two signatures over different messages at that sequence.
 * @name Misbehaviour
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.Misbehaviour
 */
export interface Misbehaviour {
    sequence: bigint;
    signatureOne?: SignatureAndData;
    signatureTwo?: SignatureAndData;
}
export interface MisbehaviourProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v3.Misbehaviour';
    value: Uint8Array;
}
/**
 * Misbehaviour defines misbehaviour for a solo machine which consists
 * of a sequence and two signatures over different messages at that sequence.
 * @name MisbehaviourSDKType
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.Misbehaviour
 */
export interface MisbehaviourSDKType {
    sequence: bigint;
    signature_one?: SignatureAndDataSDKType;
    signature_two?: SignatureAndDataSDKType;
}
/**
 * SignatureAndData contains a signature and the data signed over to create that
 * signature.
 * @name SignatureAndData
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.SignatureAndData
 */
export interface SignatureAndData {
    signature: Uint8Array;
    path: Uint8Array;
    data: Uint8Array;
    timestamp: bigint;
}
export interface SignatureAndDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v3.SignatureAndData';
    value: Uint8Array;
}
/**
 * SignatureAndData contains a signature and the data signed over to create that
 * signature.
 * @name SignatureAndDataSDKType
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.SignatureAndData
 */
export interface SignatureAndDataSDKType {
    signature: Uint8Array;
    path: Uint8Array;
    data: Uint8Array;
    timestamp: bigint;
}
/**
 * TimestampedSignatureData contains the signature data and the timestamp of the
 * signature.
 * @name TimestampedSignatureData
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.TimestampedSignatureData
 */
export interface TimestampedSignatureData {
    signatureData: Uint8Array;
    timestamp: bigint;
}
export interface TimestampedSignatureDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v3.TimestampedSignatureData';
    value: Uint8Array;
}
/**
 * TimestampedSignatureData contains the signature data and the timestamp of the
 * signature.
 * @name TimestampedSignatureDataSDKType
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.TimestampedSignatureData
 */
export interface TimestampedSignatureDataSDKType {
    signature_data: Uint8Array;
    timestamp: bigint;
}
/**
 * SignBytes defines the signed bytes used for signature verification.
 * @name SignBytes
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.SignBytes
 */
export interface SignBytes {
    /**
     * the sequence number
     */
    sequence: bigint;
    /**
     * the proof timestamp
     */
    timestamp: bigint;
    /**
     * the public key diversifier
     */
    diversifier: string;
    /**
     * the standardised path bytes
     */
    path: Uint8Array;
    /**
     * the marshaled data bytes
     */
    data: Uint8Array;
}
export interface SignBytesProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v3.SignBytes';
    value: Uint8Array;
}
/**
 * SignBytes defines the signed bytes used for signature verification.
 * @name SignBytesSDKType
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.SignBytes
 */
export interface SignBytesSDKType {
    sequence: bigint;
    timestamp: bigint;
    diversifier: string;
    path: Uint8Array;
    data: Uint8Array;
}
/**
 * HeaderData returns the SignBytes data for update verification.
 * @name HeaderData
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.HeaderData
 */
export interface HeaderData {
    /**
     * header public key
     */
    newPubKey?: Any;
    /**
     * header diversifier
     */
    newDiversifier: string;
}
export interface HeaderDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v3.HeaderData';
    value: Uint8Array;
}
/**
 * HeaderData returns the SignBytes data for update verification.
 * @name HeaderDataSDKType
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.HeaderData
 */
export interface HeaderDataSDKType {
    new_pub_key?: AnySDKType;
    new_diversifier: string;
}
/**
 * ClientState defines a solo machine client that tracks the current consensus
 * state and if the client is frozen.
 * @name ClientState
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.ClientState
 */
export declare const ClientState: {
    typeUrl: "/ibc.lightclients.solomachine.v3.ClientState";
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
 * ConsensusState defines a solo machine consensus state. The sequence of a
 * consensus state is contained in the "height" key used in storing the
 * consensus state.
 * @name ConsensusState
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.ConsensusState
 */
export declare const ConsensusState: {
    typeUrl: "/ibc.lightclients.solomachine.v3.ConsensusState";
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
 * Header defines a solo machine consensus header
 * @name Header
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.Header
 */
export declare const Header: {
    typeUrl: "/ibc.lightclients.solomachine.v3.Header";
    aminoType: "cosmos-sdk/Header";
    is(o: any): o is Header;
    isSDK(o: any): o is HeaderSDKType;
    encode(message: Header, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Header;
    fromJSON(object: any): Header;
    toJSON(message: Header): JsonSafe<Header>;
    fromPartial(object: Partial<Header>): Header;
    fromProtoMsg(message: HeaderProtoMsg): Header;
    toProto(message: Header): Uint8Array;
    toProtoMsg(message: Header): HeaderProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Misbehaviour defines misbehaviour for a solo machine which consists
 * of a sequence and two signatures over different messages at that sequence.
 * @name Misbehaviour
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.Misbehaviour
 */
export declare const Misbehaviour: {
    typeUrl: "/ibc.lightclients.solomachine.v3.Misbehaviour";
    aminoType: "cosmos-sdk/Misbehaviour";
    is(o: any): o is Misbehaviour;
    isSDK(o: any): o is MisbehaviourSDKType;
    encode(message: Misbehaviour, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Misbehaviour;
    fromJSON(object: any): Misbehaviour;
    toJSON(message: Misbehaviour): JsonSafe<Misbehaviour>;
    fromPartial(object: Partial<Misbehaviour>): Misbehaviour;
    fromProtoMsg(message: MisbehaviourProtoMsg): Misbehaviour;
    toProto(message: Misbehaviour): Uint8Array;
    toProtoMsg(message: Misbehaviour): MisbehaviourProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SignatureAndData contains a signature and the data signed over to create that
 * signature.
 * @name SignatureAndData
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.SignatureAndData
 */
export declare const SignatureAndData: {
    typeUrl: "/ibc.lightclients.solomachine.v3.SignatureAndData";
    aminoType: "cosmos-sdk/SignatureAndData";
    is(o: any): o is SignatureAndData;
    isSDK(o: any): o is SignatureAndDataSDKType;
    encode(message: SignatureAndData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SignatureAndData;
    fromJSON(object: any): SignatureAndData;
    toJSON(message: SignatureAndData): JsonSafe<SignatureAndData>;
    fromPartial(object: Partial<SignatureAndData>): SignatureAndData;
    fromProtoMsg(message: SignatureAndDataProtoMsg): SignatureAndData;
    toProto(message: SignatureAndData): Uint8Array;
    toProtoMsg(message: SignatureAndData): SignatureAndDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TimestampedSignatureData contains the signature data and the timestamp of the
 * signature.
 * @name TimestampedSignatureData
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.TimestampedSignatureData
 */
export declare const TimestampedSignatureData: {
    typeUrl: "/ibc.lightclients.solomachine.v3.TimestampedSignatureData";
    aminoType: "cosmos-sdk/TimestampedSignatureData";
    is(o: any): o is TimestampedSignatureData;
    isSDK(o: any): o is TimestampedSignatureDataSDKType;
    encode(message: TimestampedSignatureData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TimestampedSignatureData;
    fromJSON(object: any): TimestampedSignatureData;
    toJSON(message: TimestampedSignatureData): JsonSafe<TimestampedSignatureData>;
    fromPartial(object: Partial<TimestampedSignatureData>): TimestampedSignatureData;
    fromProtoMsg(message: TimestampedSignatureDataProtoMsg): TimestampedSignatureData;
    toProto(message: TimestampedSignatureData): Uint8Array;
    toProtoMsg(message: TimestampedSignatureData): TimestampedSignatureDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SignBytes defines the signed bytes used for signature verification.
 * @name SignBytes
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.SignBytes
 */
export declare const SignBytes: {
    typeUrl: "/ibc.lightclients.solomachine.v3.SignBytes";
    aminoType: "cosmos-sdk/SignBytes";
    is(o: any): o is SignBytes;
    isSDK(o: any): o is SignBytesSDKType;
    encode(message: SignBytes, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SignBytes;
    fromJSON(object: any): SignBytes;
    toJSON(message: SignBytes): JsonSafe<SignBytes>;
    fromPartial(object: Partial<SignBytes>): SignBytes;
    fromProtoMsg(message: SignBytesProtoMsg): SignBytes;
    toProto(message: SignBytes): Uint8Array;
    toProtoMsg(message: SignBytes): SignBytesProtoMsg;
    registerTypeUrl(): void;
};
/**
 * HeaderData returns the SignBytes data for update verification.
 * @name HeaderData
 * @package ibc.lightclients.solomachine.v3
 * @see proto type: ibc.lightclients.solomachine.v3.HeaderData
 */
export declare const HeaderData: {
    typeUrl: "/ibc.lightclients.solomachine.v3.HeaderData";
    aminoType: "cosmos-sdk/HeaderData";
    is(o: any): o is HeaderData;
    isSDK(o: any): o is HeaderDataSDKType;
    encode(message: HeaderData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): HeaderData;
    fromJSON(object: any): HeaderData;
    toJSON(message: HeaderData): JsonSafe<HeaderData>;
    fromPartial(object: Partial<HeaderData>): HeaderData;
    fromProtoMsg(message: HeaderDataProtoMsg): HeaderData;
    toProto(message: HeaderData): Uint8Array;
    toProtoMsg(message: HeaderData): HeaderDataProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=solomachine.d.ts.map