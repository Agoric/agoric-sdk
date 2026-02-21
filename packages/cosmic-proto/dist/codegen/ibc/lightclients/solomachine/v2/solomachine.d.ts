import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { ConnectionEnd, type ConnectionEndSDKType } from '../../../core/connection/v1/connection.js';
import { Channel, type ChannelSDKType } from '../../../core/channel/v1/channel.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * DataType defines the type of solo machine proof being created. This is done
 * to preserve uniqueness of different data sign byte encodings.
 */
export declare enum DataType {
    /** DATA_TYPE_UNINITIALIZED_UNSPECIFIED - Default State */
    DATA_TYPE_UNINITIALIZED_UNSPECIFIED = 0,
    /** DATA_TYPE_CLIENT_STATE - Data type for client state verification */
    DATA_TYPE_CLIENT_STATE = 1,
    /** DATA_TYPE_CONSENSUS_STATE - Data type for consensus state verification */
    DATA_TYPE_CONSENSUS_STATE = 2,
    /** DATA_TYPE_CONNECTION_STATE - Data type for connection state verification */
    DATA_TYPE_CONNECTION_STATE = 3,
    /** DATA_TYPE_CHANNEL_STATE - Data type for channel state verification */
    DATA_TYPE_CHANNEL_STATE = 4,
    /** DATA_TYPE_PACKET_COMMITMENT - Data type for packet commitment verification */
    DATA_TYPE_PACKET_COMMITMENT = 5,
    /** DATA_TYPE_PACKET_ACKNOWLEDGEMENT - Data type for packet acknowledgement verification */
    DATA_TYPE_PACKET_ACKNOWLEDGEMENT = 6,
    /** DATA_TYPE_PACKET_RECEIPT_ABSENCE - Data type for packet receipt absence verification */
    DATA_TYPE_PACKET_RECEIPT_ABSENCE = 7,
    /** DATA_TYPE_NEXT_SEQUENCE_RECV - Data type for next sequence recv verification */
    DATA_TYPE_NEXT_SEQUENCE_RECV = 8,
    /** DATA_TYPE_HEADER - Data type for header verification */
    DATA_TYPE_HEADER = 9,
    UNRECOGNIZED = -1
}
export declare const DataTypeSDKType: typeof DataType;
export declare function dataTypeFromJSON(object: any): DataType;
export declare function dataTypeToJSON(object: DataType): string;
/**
 * ClientState defines a solo machine client that tracks the current consensus
 * state and if the client is frozen.
 * @name ClientState
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ClientState
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
    /**
     * when set to true, will allow governance to update a solo machine client.
     * The client will be unfrozen if it is frozen.
     */
    allowUpdateAfterProposal: boolean;
}
export interface ClientStateProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.ClientState';
    value: Uint8Array;
}
/**
 * ClientState defines a solo machine client that tracks the current consensus
 * state and if the client is frozen.
 * @name ClientStateSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ClientState
 */
export interface ClientStateSDKType {
    sequence: bigint;
    is_frozen: boolean;
    consensus_state?: ConsensusStateSDKType;
    allow_update_after_proposal: boolean;
}
/**
 * ConsensusState defines a solo machine consensus state. The sequence of a
 * consensus state is contained in the "height" key used in storing the
 * consensus state.
 * @name ConsensusState
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConsensusState
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
    typeUrl: '/ibc.lightclients.solomachine.v2.ConsensusState';
    value: Uint8Array;
}
/**
 * ConsensusState defines a solo machine consensus state. The sequence of a
 * consensus state is contained in the "height" key used in storing the
 * consensus state.
 * @name ConsensusStateSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConsensusState
 */
export interface ConsensusStateSDKType {
    public_key?: AnySDKType;
    diversifier: string;
    timestamp: bigint;
}
/**
 * Header defines a solo machine consensus header
 * @name Header
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.Header
 */
export interface Header {
    /**
     * sequence to update solo machine public key at
     */
    sequence: bigint;
    timestamp: bigint;
    signature: Uint8Array;
    newPublicKey?: Any;
    newDiversifier: string;
}
export interface HeaderProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.Header';
    value: Uint8Array;
}
/**
 * Header defines a solo machine consensus header
 * @name HeaderSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.Header
 */
export interface HeaderSDKType {
    sequence: bigint;
    timestamp: bigint;
    signature: Uint8Array;
    new_public_key?: AnySDKType;
    new_diversifier: string;
}
/**
 * Misbehaviour defines misbehaviour for a solo machine which consists
 * of a sequence and two signatures over different messages at that sequence.
 * @name Misbehaviour
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.Misbehaviour
 */
export interface Misbehaviour {
    clientId: string;
    sequence: bigint;
    signatureOne?: SignatureAndData;
    signatureTwo?: SignatureAndData;
}
export interface MisbehaviourProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.Misbehaviour';
    value: Uint8Array;
}
/**
 * Misbehaviour defines misbehaviour for a solo machine which consists
 * of a sequence and two signatures over different messages at that sequence.
 * @name MisbehaviourSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.Misbehaviour
 */
export interface MisbehaviourSDKType {
    client_id: string;
    sequence: bigint;
    signature_one?: SignatureAndDataSDKType;
    signature_two?: SignatureAndDataSDKType;
}
/**
 * SignatureAndData contains a signature and the data signed over to create that
 * signature.
 * @name SignatureAndData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.SignatureAndData
 */
export interface SignatureAndData {
    signature: Uint8Array;
    dataType: DataType;
    data: Uint8Array;
    timestamp: bigint;
}
export interface SignatureAndDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.SignatureAndData';
    value: Uint8Array;
}
/**
 * SignatureAndData contains a signature and the data signed over to create that
 * signature.
 * @name SignatureAndDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.SignatureAndData
 */
export interface SignatureAndDataSDKType {
    signature: Uint8Array;
    data_type: DataType;
    data: Uint8Array;
    timestamp: bigint;
}
/**
 * TimestampedSignatureData contains the signature data and the timestamp of the
 * signature.
 * @name TimestampedSignatureData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.TimestampedSignatureData
 */
export interface TimestampedSignatureData {
    signatureData: Uint8Array;
    timestamp: bigint;
}
export interface TimestampedSignatureDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.TimestampedSignatureData';
    value: Uint8Array;
}
/**
 * TimestampedSignatureData contains the signature data and the timestamp of the
 * signature.
 * @name TimestampedSignatureDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.TimestampedSignatureData
 */
export interface TimestampedSignatureDataSDKType {
    signature_data: Uint8Array;
    timestamp: bigint;
}
/**
 * SignBytes defines the signed bytes used for signature verification.
 * @name SignBytes
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.SignBytes
 */
export interface SignBytes {
    sequence: bigint;
    timestamp: bigint;
    diversifier: string;
    /**
     * type of the data used
     */
    dataType: DataType;
    /**
     * marshaled data
     */
    data: Uint8Array;
}
export interface SignBytesProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.SignBytes';
    value: Uint8Array;
}
/**
 * SignBytes defines the signed bytes used for signature verification.
 * @name SignBytesSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.SignBytes
 */
export interface SignBytesSDKType {
    sequence: bigint;
    timestamp: bigint;
    diversifier: string;
    data_type: DataType;
    data: Uint8Array;
}
/**
 * HeaderData returns the SignBytes data for update verification.
 * @name HeaderData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.HeaderData
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
    typeUrl: '/ibc.lightclients.solomachine.v2.HeaderData';
    value: Uint8Array;
}
/**
 * HeaderData returns the SignBytes data for update verification.
 * @name HeaderDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.HeaderData
 */
export interface HeaderDataSDKType {
    new_pub_key?: AnySDKType;
    new_diversifier: string;
}
/**
 * ClientStateData returns the SignBytes data for client state verification.
 * @name ClientStateData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ClientStateData
 */
export interface ClientStateData {
    path: Uint8Array;
    clientState?: Any;
}
export interface ClientStateDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.ClientStateData';
    value: Uint8Array;
}
/**
 * ClientStateData returns the SignBytes data for client state verification.
 * @name ClientStateDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ClientStateData
 */
export interface ClientStateDataSDKType {
    path: Uint8Array;
    client_state?: AnySDKType;
}
/**
 * ConsensusStateData returns the SignBytes data for consensus state
 * verification.
 * @name ConsensusStateData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConsensusStateData
 */
export interface ConsensusStateData {
    path: Uint8Array;
    consensusState?: Any;
}
export interface ConsensusStateDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.ConsensusStateData';
    value: Uint8Array;
}
/**
 * ConsensusStateData returns the SignBytes data for consensus state
 * verification.
 * @name ConsensusStateDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConsensusStateData
 */
export interface ConsensusStateDataSDKType {
    path: Uint8Array;
    consensus_state?: AnySDKType;
}
/**
 * ConnectionStateData returns the SignBytes data for connection state
 * verification.
 * @name ConnectionStateData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConnectionStateData
 */
export interface ConnectionStateData {
    path: Uint8Array;
    connection?: ConnectionEnd;
}
export interface ConnectionStateDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.ConnectionStateData';
    value: Uint8Array;
}
/**
 * ConnectionStateData returns the SignBytes data for connection state
 * verification.
 * @name ConnectionStateDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConnectionStateData
 */
export interface ConnectionStateDataSDKType {
    path: Uint8Array;
    connection?: ConnectionEndSDKType;
}
/**
 * ChannelStateData returns the SignBytes data for channel state
 * verification.
 * @name ChannelStateData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ChannelStateData
 */
export interface ChannelStateData {
    path: Uint8Array;
    channel?: Channel;
}
export interface ChannelStateDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.ChannelStateData';
    value: Uint8Array;
}
/**
 * ChannelStateData returns the SignBytes data for channel state
 * verification.
 * @name ChannelStateDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ChannelStateData
 */
export interface ChannelStateDataSDKType {
    path: Uint8Array;
    channel?: ChannelSDKType;
}
/**
 * PacketCommitmentData returns the SignBytes data for packet commitment
 * verification.
 * @name PacketCommitmentData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketCommitmentData
 */
export interface PacketCommitmentData {
    path: Uint8Array;
    commitment: Uint8Array;
}
export interface PacketCommitmentDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.PacketCommitmentData';
    value: Uint8Array;
}
/**
 * PacketCommitmentData returns the SignBytes data for packet commitment
 * verification.
 * @name PacketCommitmentDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketCommitmentData
 */
export interface PacketCommitmentDataSDKType {
    path: Uint8Array;
    commitment: Uint8Array;
}
/**
 * PacketAcknowledgementData returns the SignBytes data for acknowledgement
 * verification.
 * @name PacketAcknowledgementData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketAcknowledgementData
 */
export interface PacketAcknowledgementData {
    path: Uint8Array;
    acknowledgement: Uint8Array;
}
export interface PacketAcknowledgementDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.PacketAcknowledgementData';
    value: Uint8Array;
}
/**
 * PacketAcknowledgementData returns the SignBytes data for acknowledgement
 * verification.
 * @name PacketAcknowledgementDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketAcknowledgementData
 */
export interface PacketAcknowledgementDataSDKType {
    path: Uint8Array;
    acknowledgement: Uint8Array;
}
/**
 * PacketReceiptAbsenceData returns the SignBytes data for
 * packet receipt absence verification.
 * @name PacketReceiptAbsenceData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketReceiptAbsenceData
 */
export interface PacketReceiptAbsenceData {
    path: Uint8Array;
}
export interface PacketReceiptAbsenceDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.PacketReceiptAbsenceData';
    value: Uint8Array;
}
/**
 * PacketReceiptAbsenceData returns the SignBytes data for
 * packet receipt absence verification.
 * @name PacketReceiptAbsenceDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketReceiptAbsenceData
 */
export interface PacketReceiptAbsenceDataSDKType {
    path: Uint8Array;
}
/**
 * NextSequenceRecvData returns the SignBytes data for verification of the next
 * sequence to be received.
 * @name NextSequenceRecvData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.NextSequenceRecvData
 */
export interface NextSequenceRecvData {
    path: Uint8Array;
    nextSeqRecv: bigint;
}
export interface NextSequenceRecvDataProtoMsg {
    typeUrl: '/ibc.lightclients.solomachine.v2.NextSequenceRecvData';
    value: Uint8Array;
}
/**
 * NextSequenceRecvData returns the SignBytes data for verification of the next
 * sequence to be received.
 * @name NextSequenceRecvDataSDKType
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.NextSequenceRecvData
 */
export interface NextSequenceRecvDataSDKType {
    path: Uint8Array;
    next_seq_recv: bigint;
}
/**
 * ClientState defines a solo machine client that tracks the current consensus
 * state and if the client is frozen.
 * @name ClientState
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ClientState
 */
export declare const ClientState: {
    typeUrl: "/ibc.lightclients.solomachine.v2.ClientState";
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
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConsensusState
 */
export declare const ConsensusState: {
    typeUrl: "/ibc.lightclients.solomachine.v2.ConsensusState";
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
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.Header
 */
export declare const Header: {
    typeUrl: "/ibc.lightclients.solomachine.v2.Header";
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
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.Misbehaviour
 */
export declare const Misbehaviour: {
    typeUrl: "/ibc.lightclients.solomachine.v2.Misbehaviour";
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
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.SignatureAndData
 */
export declare const SignatureAndData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.SignatureAndData";
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
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.TimestampedSignatureData
 */
export declare const TimestampedSignatureData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.TimestampedSignatureData";
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
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.SignBytes
 */
export declare const SignBytes: {
    typeUrl: "/ibc.lightclients.solomachine.v2.SignBytes";
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
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.HeaderData
 */
export declare const HeaderData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.HeaderData";
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
/**
 * ClientStateData returns the SignBytes data for client state verification.
 * @name ClientStateData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ClientStateData
 */
export declare const ClientStateData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.ClientStateData";
    aminoType: "cosmos-sdk/ClientStateData";
    is(o: any): o is ClientStateData;
    isSDK(o: any): o is ClientStateDataSDKType;
    encode(message: ClientStateData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ClientStateData;
    fromJSON(object: any): ClientStateData;
    toJSON(message: ClientStateData): JsonSafe<ClientStateData>;
    fromPartial(object: Partial<ClientStateData>): ClientStateData;
    fromProtoMsg(message: ClientStateDataProtoMsg): ClientStateData;
    toProto(message: ClientStateData): Uint8Array;
    toProtoMsg(message: ClientStateData): ClientStateDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ConsensusStateData returns the SignBytes data for consensus state
 * verification.
 * @name ConsensusStateData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConsensusStateData
 */
export declare const ConsensusStateData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.ConsensusStateData";
    aminoType: "cosmos-sdk/ConsensusStateData";
    is(o: any): o is ConsensusStateData;
    isSDK(o: any): o is ConsensusStateDataSDKType;
    encode(message: ConsensusStateData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConsensusStateData;
    fromJSON(object: any): ConsensusStateData;
    toJSON(message: ConsensusStateData): JsonSafe<ConsensusStateData>;
    fromPartial(object: Partial<ConsensusStateData>): ConsensusStateData;
    fromProtoMsg(message: ConsensusStateDataProtoMsg): ConsensusStateData;
    toProto(message: ConsensusStateData): Uint8Array;
    toProtoMsg(message: ConsensusStateData): ConsensusStateDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ConnectionStateData returns the SignBytes data for connection state
 * verification.
 * @name ConnectionStateData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ConnectionStateData
 */
export declare const ConnectionStateData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.ConnectionStateData";
    aminoType: "cosmos-sdk/ConnectionStateData";
    is(o: any): o is ConnectionStateData;
    isSDK(o: any): o is ConnectionStateDataSDKType;
    encode(message: ConnectionStateData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConnectionStateData;
    fromJSON(object: any): ConnectionStateData;
    toJSON(message: ConnectionStateData): JsonSafe<ConnectionStateData>;
    fromPartial(object: Partial<ConnectionStateData>): ConnectionStateData;
    fromProtoMsg(message: ConnectionStateDataProtoMsg): ConnectionStateData;
    toProto(message: ConnectionStateData): Uint8Array;
    toProtoMsg(message: ConnectionStateData): ConnectionStateDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ChannelStateData returns the SignBytes data for channel state
 * verification.
 * @name ChannelStateData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.ChannelStateData
 */
export declare const ChannelStateData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.ChannelStateData";
    aminoType: "cosmos-sdk/ChannelStateData";
    is(o: any): o is ChannelStateData;
    isSDK(o: any): o is ChannelStateDataSDKType;
    encode(message: ChannelStateData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ChannelStateData;
    fromJSON(object: any): ChannelStateData;
    toJSON(message: ChannelStateData): JsonSafe<ChannelStateData>;
    fromPartial(object: Partial<ChannelStateData>): ChannelStateData;
    fromProtoMsg(message: ChannelStateDataProtoMsg): ChannelStateData;
    toProto(message: ChannelStateData): Uint8Array;
    toProtoMsg(message: ChannelStateData): ChannelStateDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * PacketCommitmentData returns the SignBytes data for packet commitment
 * verification.
 * @name PacketCommitmentData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketCommitmentData
 */
export declare const PacketCommitmentData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.PacketCommitmentData";
    aminoType: "cosmos-sdk/PacketCommitmentData";
    is(o: any): o is PacketCommitmentData;
    isSDK(o: any): o is PacketCommitmentDataSDKType;
    encode(message: PacketCommitmentData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PacketCommitmentData;
    fromJSON(object: any): PacketCommitmentData;
    toJSON(message: PacketCommitmentData): JsonSafe<PacketCommitmentData>;
    fromPartial(object: Partial<PacketCommitmentData>): PacketCommitmentData;
    fromProtoMsg(message: PacketCommitmentDataProtoMsg): PacketCommitmentData;
    toProto(message: PacketCommitmentData): Uint8Array;
    toProtoMsg(message: PacketCommitmentData): PacketCommitmentDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * PacketAcknowledgementData returns the SignBytes data for acknowledgement
 * verification.
 * @name PacketAcknowledgementData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketAcknowledgementData
 */
export declare const PacketAcknowledgementData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.PacketAcknowledgementData";
    aminoType: "cosmos-sdk/PacketAcknowledgementData";
    is(o: any): o is PacketAcknowledgementData;
    isSDK(o: any): o is PacketAcknowledgementDataSDKType;
    encode(message: PacketAcknowledgementData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PacketAcknowledgementData;
    fromJSON(object: any): PacketAcknowledgementData;
    toJSON(message: PacketAcknowledgementData): JsonSafe<PacketAcknowledgementData>;
    fromPartial(object: Partial<PacketAcknowledgementData>): PacketAcknowledgementData;
    fromProtoMsg(message: PacketAcknowledgementDataProtoMsg): PacketAcknowledgementData;
    toProto(message: PacketAcknowledgementData): Uint8Array;
    toProtoMsg(message: PacketAcknowledgementData): PacketAcknowledgementDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * PacketReceiptAbsenceData returns the SignBytes data for
 * packet receipt absence verification.
 * @name PacketReceiptAbsenceData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.PacketReceiptAbsenceData
 */
export declare const PacketReceiptAbsenceData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.PacketReceiptAbsenceData";
    aminoType: "cosmos-sdk/PacketReceiptAbsenceData";
    is(o: any): o is PacketReceiptAbsenceData;
    isSDK(o: any): o is PacketReceiptAbsenceDataSDKType;
    encode(message: PacketReceiptAbsenceData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PacketReceiptAbsenceData;
    fromJSON(object: any): PacketReceiptAbsenceData;
    toJSON(message: PacketReceiptAbsenceData): JsonSafe<PacketReceiptAbsenceData>;
    fromPartial(object: Partial<PacketReceiptAbsenceData>): PacketReceiptAbsenceData;
    fromProtoMsg(message: PacketReceiptAbsenceDataProtoMsg): PacketReceiptAbsenceData;
    toProto(message: PacketReceiptAbsenceData): Uint8Array;
    toProtoMsg(message: PacketReceiptAbsenceData): PacketReceiptAbsenceDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * NextSequenceRecvData returns the SignBytes data for verification of the next
 * sequence to be received.
 * @name NextSequenceRecvData
 * @package ibc.lightclients.solomachine.v2
 * @see proto type: ibc.lightclients.solomachine.v2.NextSequenceRecvData
 */
export declare const NextSequenceRecvData: {
    typeUrl: "/ibc.lightclients.solomachine.v2.NextSequenceRecvData";
    aminoType: "cosmos-sdk/NextSequenceRecvData";
    is(o: any): o is NextSequenceRecvData;
    isSDK(o: any): o is NextSequenceRecvDataSDKType;
    encode(message: NextSequenceRecvData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): NextSequenceRecvData;
    fromJSON(object: any): NextSequenceRecvData;
    toJSON(message: NextSequenceRecvData): JsonSafe<NextSequenceRecvData>;
    fromPartial(object: Partial<NextSequenceRecvData>): NextSequenceRecvData;
    fromProtoMsg(message: NextSequenceRecvDataProtoMsg): NextSequenceRecvData;
    toProto(message: NextSequenceRecvData): Uint8Array;
    toProtoMsg(message: NextSequenceRecvData): NextSequenceRecvDataProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=solomachine.d.ts.map