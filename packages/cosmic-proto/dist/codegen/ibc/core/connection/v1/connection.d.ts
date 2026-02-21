import { MerklePrefix, type MerklePrefixSDKType } from '../../commitment/v1/commitment.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * State defines if a connection is in one of the following states:
 * INIT, TRYOPEN, OPEN or UNINITIALIZED.
 */
export declare enum State {
    /** STATE_UNINITIALIZED_UNSPECIFIED - Default State */
    STATE_UNINITIALIZED_UNSPECIFIED = 0,
    /** STATE_INIT - A connection end has just started the opening handshake. */
    STATE_INIT = 1,
    /**
     * STATE_TRYOPEN - A connection end has acknowledged the handshake step on the counterparty
     * chain.
     */
    STATE_TRYOPEN = 2,
    /** STATE_OPEN - A connection end has completed the handshake. */
    STATE_OPEN = 3,
    UNRECOGNIZED = -1
}
export declare const StateSDKType: typeof State;
export declare function stateFromJSON(object: any): State;
export declare function stateToJSON(object: State): string;
/**
 * ConnectionEnd defines a stateful object on a chain connected to another
 * separate one.
 * NOTE: there must only be 2 defined ConnectionEnds to establish
 * a connection between two chains.
 * @name ConnectionEnd
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ConnectionEnd
 */
export interface ConnectionEnd {
    /**
     * client associated with this connection.
     */
    clientId: string;
    /**
     * IBC version which can be utilised to determine encodings or protocols for
     * channels or packets utilising this connection.
     */
    versions: Version[];
    /**
     * current state of the connection end.
     */
    state: State;
    /**
     * counterparty chain associated with this connection.
     */
    counterparty: Counterparty;
    /**
     * delay period that must pass before a consensus state can be used for
     * packet-verification NOTE: delay period logic is only implemented by some
     * clients.
     */
    delayPeriod: bigint;
}
export interface ConnectionEndProtoMsg {
    typeUrl: '/ibc.core.connection.v1.ConnectionEnd';
    value: Uint8Array;
}
/**
 * ConnectionEnd defines a stateful object on a chain connected to another
 * separate one.
 * NOTE: there must only be 2 defined ConnectionEnds to establish
 * a connection between two chains.
 * @name ConnectionEndSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ConnectionEnd
 */
export interface ConnectionEndSDKType {
    client_id: string;
    versions: VersionSDKType[];
    state: State;
    counterparty: CounterpartySDKType;
    delay_period: bigint;
}
/**
 * IdentifiedConnection defines a connection with additional connection
 * identifier field.
 * @name IdentifiedConnection
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.IdentifiedConnection
 */
export interface IdentifiedConnection {
    /**
     * connection identifier.
     */
    id: string;
    /**
     * client associated with this connection.
     */
    clientId: string;
    /**
     * IBC version which can be utilised to determine encodings or protocols for
     * channels or packets utilising this connection
     */
    versions: Version[];
    /**
     * current state of the connection end.
     */
    state: State;
    /**
     * counterparty chain associated with this connection.
     */
    counterparty: Counterparty;
    /**
     * delay period associated with this connection.
     */
    delayPeriod: bigint;
}
export interface IdentifiedConnectionProtoMsg {
    typeUrl: '/ibc.core.connection.v1.IdentifiedConnection';
    value: Uint8Array;
}
/**
 * IdentifiedConnection defines a connection with additional connection
 * identifier field.
 * @name IdentifiedConnectionSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.IdentifiedConnection
 */
export interface IdentifiedConnectionSDKType {
    id: string;
    client_id: string;
    versions: VersionSDKType[];
    state: State;
    counterparty: CounterpartySDKType;
    delay_period: bigint;
}
/**
 * Counterparty defines the counterparty chain associated with a connection end.
 * @name Counterparty
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Counterparty
 */
export interface Counterparty {
    /**
     * identifies the client on the counterparty chain associated with a given
     * connection.
     */
    clientId: string;
    /**
     * identifies the connection end on the counterparty chain associated with a
     * given connection.
     */
    connectionId: string;
    /**
     * commitment merkle prefix of the counterparty chain.
     */
    prefix: MerklePrefix;
}
export interface CounterpartyProtoMsg {
    typeUrl: '/ibc.core.connection.v1.Counterparty';
    value: Uint8Array;
}
/**
 * Counterparty defines the counterparty chain associated with a connection end.
 * @name CounterpartySDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Counterparty
 */
export interface CounterpartySDKType {
    client_id: string;
    connection_id: string;
    prefix: MerklePrefixSDKType;
}
/**
 * ClientPaths define all the connection paths for a client state.
 * @name ClientPaths
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ClientPaths
 */
export interface ClientPaths {
    /**
     * list of connection paths
     */
    paths: string[];
}
export interface ClientPathsProtoMsg {
    typeUrl: '/ibc.core.connection.v1.ClientPaths';
    value: Uint8Array;
}
/**
 * ClientPaths define all the connection paths for a client state.
 * @name ClientPathsSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ClientPaths
 */
export interface ClientPathsSDKType {
    paths: string[];
}
/**
 * ConnectionPaths define all the connection paths for a given client state.
 * @name ConnectionPaths
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ConnectionPaths
 */
export interface ConnectionPaths {
    /**
     * client state unique identifier
     */
    clientId: string;
    /**
     * list of connection paths
     */
    paths: string[];
}
export interface ConnectionPathsProtoMsg {
    typeUrl: '/ibc.core.connection.v1.ConnectionPaths';
    value: Uint8Array;
}
/**
 * ConnectionPaths define all the connection paths for a given client state.
 * @name ConnectionPathsSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ConnectionPaths
 */
export interface ConnectionPathsSDKType {
    client_id: string;
    paths: string[];
}
/**
 * Version defines the versioning scheme used to negotiate the IBC verison in
 * the connection handshake.
 * @name Version
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Version
 */
export interface Version {
    /**
     * unique version identifier
     */
    identifier: string;
    /**
     * list of features compatible with the specified identifier
     */
    features: string[];
}
export interface VersionProtoMsg {
    typeUrl: '/ibc.core.connection.v1.Version';
    value: Uint8Array;
}
/**
 * Version defines the versioning scheme used to negotiate the IBC verison in
 * the connection handshake.
 * @name VersionSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Version
 */
export interface VersionSDKType {
    identifier: string;
    features: string[];
}
/**
 * Params defines the set of Connection parameters.
 * @name Params
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Params
 */
export interface Params {
    /**
     * maximum expected time per block (in nanoseconds), used to enforce block delay. This parameter should reflect the
     * largest amount of time that the chain might reasonably take to produce the next block under normal operating
     * conditions. A safe choice is 3-5x the expected time per block.
     */
    maxExpectedTimePerBlock: bigint;
}
export interface ParamsProtoMsg {
    typeUrl: '/ibc.core.connection.v1.Params';
    value: Uint8Array;
}
/**
 * Params defines the set of Connection parameters.
 * @name ParamsSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Params
 */
export interface ParamsSDKType {
    max_expected_time_per_block: bigint;
}
/**
 * ConnectionEnd defines a stateful object on a chain connected to another
 * separate one.
 * NOTE: there must only be 2 defined ConnectionEnds to establish
 * a connection between two chains.
 * @name ConnectionEnd
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ConnectionEnd
 */
export declare const ConnectionEnd: {
    typeUrl: "/ibc.core.connection.v1.ConnectionEnd";
    aminoType: "cosmos-sdk/ConnectionEnd";
    is(o: any): o is ConnectionEnd;
    isSDK(o: any): o is ConnectionEndSDKType;
    encode(message: ConnectionEnd, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConnectionEnd;
    fromJSON(object: any): ConnectionEnd;
    toJSON(message: ConnectionEnd): JsonSafe<ConnectionEnd>;
    fromPartial(object: Partial<ConnectionEnd>): ConnectionEnd;
    fromProtoMsg(message: ConnectionEndProtoMsg): ConnectionEnd;
    toProto(message: ConnectionEnd): Uint8Array;
    toProtoMsg(message: ConnectionEnd): ConnectionEndProtoMsg;
    registerTypeUrl(): void;
};
/**
 * IdentifiedConnection defines a connection with additional connection
 * identifier field.
 * @name IdentifiedConnection
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.IdentifiedConnection
 */
export declare const IdentifiedConnection: {
    typeUrl: "/ibc.core.connection.v1.IdentifiedConnection";
    aminoType: "cosmos-sdk/IdentifiedConnection";
    is(o: any): o is IdentifiedConnection;
    isSDK(o: any): o is IdentifiedConnectionSDKType;
    encode(message: IdentifiedConnection, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): IdentifiedConnection;
    fromJSON(object: any): IdentifiedConnection;
    toJSON(message: IdentifiedConnection): JsonSafe<IdentifiedConnection>;
    fromPartial(object: Partial<IdentifiedConnection>): IdentifiedConnection;
    fromProtoMsg(message: IdentifiedConnectionProtoMsg): IdentifiedConnection;
    toProto(message: IdentifiedConnection): Uint8Array;
    toProtoMsg(message: IdentifiedConnection): IdentifiedConnectionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Counterparty defines the counterparty chain associated with a connection end.
 * @name Counterparty
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Counterparty
 */
export declare const Counterparty: {
    typeUrl: "/ibc.core.connection.v1.Counterparty";
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
 * ClientPaths define all the connection paths for a client state.
 * @name ClientPaths
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ClientPaths
 */
export declare const ClientPaths: {
    typeUrl: "/ibc.core.connection.v1.ClientPaths";
    aminoType: "cosmos-sdk/ClientPaths";
    is(o: any): o is ClientPaths;
    isSDK(o: any): o is ClientPathsSDKType;
    encode(message: ClientPaths, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ClientPaths;
    fromJSON(object: any): ClientPaths;
    toJSON(message: ClientPaths): JsonSafe<ClientPaths>;
    fromPartial(object: Partial<ClientPaths>): ClientPaths;
    fromProtoMsg(message: ClientPathsProtoMsg): ClientPaths;
    toProto(message: ClientPaths): Uint8Array;
    toProtoMsg(message: ClientPaths): ClientPathsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ConnectionPaths define all the connection paths for a given client state.
 * @name ConnectionPaths
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.ConnectionPaths
 */
export declare const ConnectionPaths: {
    typeUrl: "/ibc.core.connection.v1.ConnectionPaths";
    aminoType: "cosmos-sdk/ConnectionPaths";
    is(o: any): o is ConnectionPaths;
    isSDK(o: any): o is ConnectionPathsSDKType;
    encode(message: ConnectionPaths, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConnectionPaths;
    fromJSON(object: any): ConnectionPaths;
    toJSON(message: ConnectionPaths): JsonSafe<ConnectionPaths>;
    fromPartial(object: Partial<ConnectionPaths>): ConnectionPaths;
    fromProtoMsg(message: ConnectionPathsProtoMsg): ConnectionPaths;
    toProto(message: ConnectionPaths): Uint8Array;
    toProtoMsg(message: ConnectionPaths): ConnectionPathsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Version defines the versioning scheme used to negotiate the IBC verison in
 * the connection handshake.
 * @name Version
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Version
 */
export declare const Version: {
    typeUrl: "/ibc.core.connection.v1.Version";
    aminoType: "cosmos-sdk/Version";
    is(o: any): o is Version;
    isSDK(o: any): o is VersionSDKType;
    encode(message: Version, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Version;
    fromJSON(object: any): Version;
    toJSON(message: Version): JsonSafe<Version>;
    fromPartial(object: Partial<Version>): Version;
    fromProtoMsg(message: VersionProtoMsg): Version;
    toProto(message: Version): Uint8Array;
    toProtoMsg(message: Version): VersionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Params defines the set of Connection parameters.
 * @name Params
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.Params
 */
export declare const Params: {
    typeUrl: "/ibc.core.connection.v1.Params";
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
//# sourceMappingURL=connection.d.ts.map