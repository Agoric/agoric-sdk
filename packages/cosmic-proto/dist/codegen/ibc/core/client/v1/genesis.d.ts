import { IdentifiedClientState, type IdentifiedClientStateSDKType, ClientConsensusStates, type ClientConsensusStatesSDKType, Params, type ParamsSDKType } from './client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * GenesisState defines the ibc client submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.GenesisState
 */
export interface GenesisState {
    /**
     * client states with their corresponding identifiers
     */
    clients: IdentifiedClientState[];
    /**
     * consensus states from each client
     */
    clientsConsensus: ClientConsensusStates[];
    /**
     * metadata from each client
     */
    clientsMetadata: IdentifiedGenesisMetadata[];
    params: Params;
    /**
     * Deprecated: create_localhost has been deprecated.
     * The localhost client is automatically created at genesis.
     * @deprecated
     */
    createLocalhost: boolean;
    /**
     * the sequence for the next generated client identifier
     */
    nextClientSequence: bigint;
}
export interface GenesisStateProtoMsg {
    typeUrl: '/ibc.core.client.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the ibc client submodule's genesis state.
 * @name GenesisStateSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.GenesisState
 */
export interface GenesisStateSDKType {
    clients: IdentifiedClientStateSDKType[];
    clients_consensus: ClientConsensusStatesSDKType[];
    clients_metadata: IdentifiedGenesisMetadataSDKType[];
    params: ParamsSDKType;
    /**
     * @deprecated
     */
    create_localhost: boolean;
    next_client_sequence: bigint;
}
/**
 * GenesisMetadata defines the genesis type for metadata that clients may return
 * with ExportMetadata
 * @name GenesisMetadata
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.GenesisMetadata
 */
export interface GenesisMetadata {
    /**
     * store key of metadata without clientID-prefix
     */
    key: Uint8Array;
    /**
     * metadata value
     */
    value: Uint8Array;
}
export interface GenesisMetadataProtoMsg {
    typeUrl: '/ibc.core.client.v1.GenesisMetadata';
    value: Uint8Array;
}
/**
 * GenesisMetadata defines the genesis type for metadata that clients may return
 * with ExportMetadata
 * @name GenesisMetadataSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.GenesisMetadata
 */
export interface GenesisMetadataSDKType {
    key: Uint8Array;
    value: Uint8Array;
}
/**
 * IdentifiedGenesisMetadata has the client metadata with the corresponding
 * client id.
 * @name IdentifiedGenesisMetadata
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedGenesisMetadata
 */
export interface IdentifiedGenesisMetadata {
    clientId: string;
    clientMetadata: GenesisMetadata[];
}
export interface IdentifiedGenesisMetadataProtoMsg {
    typeUrl: '/ibc.core.client.v1.IdentifiedGenesisMetadata';
    value: Uint8Array;
}
/**
 * IdentifiedGenesisMetadata has the client metadata with the corresponding
 * client id.
 * @name IdentifiedGenesisMetadataSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedGenesisMetadata
 */
export interface IdentifiedGenesisMetadataSDKType {
    client_id: string;
    client_metadata: GenesisMetadataSDKType[];
}
/**
 * GenesisState defines the ibc client submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/ibc.core.client.v1.GenesisState";
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
 * GenesisMetadata defines the genesis type for metadata that clients may return
 * with ExportMetadata
 * @name GenesisMetadata
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.GenesisMetadata
 */
export declare const GenesisMetadata: {
    typeUrl: "/ibc.core.client.v1.GenesisMetadata";
    aminoType: "cosmos-sdk/GenesisMetadata";
    is(o: any): o is GenesisMetadata;
    isSDK(o: any): o is GenesisMetadataSDKType;
    encode(message: GenesisMetadata, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GenesisMetadata;
    fromJSON(object: any): GenesisMetadata;
    toJSON(message: GenesisMetadata): JsonSafe<GenesisMetadata>;
    fromPartial(object: Partial<GenesisMetadata>): GenesisMetadata;
    fromProtoMsg(message: GenesisMetadataProtoMsg): GenesisMetadata;
    toProto(message: GenesisMetadata): Uint8Array;
    toProtoMsg(message: GenesisMetadata): GenesisMetadataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * IdentifiedGenesisMetadata has the client metadata with the corresponding
 * client id.
 * @name IdentifiedGenesisMetadata
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedGenesisMetadata
 */
export declare const IdentifiedGenesisMetadata: {
    typeUrl: "/ibc.core.client.v1.IdentifiedGenesisMetadata";
    aminoType: "cosmos-sdk/IdentifiedGenesisMetadata";
    is(o: any): o is IdentifiedGenesisMetadata;
    isSDK(o: any): o is IdentifiedGenesisMetadataSDKType;
    encode(message: IdentifiedGenesisMetadata, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): IdentifiedGenesisMetadata;
    fromJSON(object: any): IdentifiedGenesisMetadata;
    toJSON(message: IdentifiedGenesisMetadata): JsonSafe<IdentifiedGenesisMetadata>;
    fromPartial(object: Partial<IdentifiedGenesisMetadata>): IdentifiedGenesisMetadata;
    fromProtoMsg(message: IdentifiedGenesisMetadataProtoMsg): IdentifiedGenesisMetadata;
    toProto(message: IdentifiedGenesisMetadata): Uint8Array;
    toProtoMsg(message: IdentifiedGenesisMetadata): IdentifiedGenesisMetadataProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map