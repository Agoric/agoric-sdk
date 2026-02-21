import { IdentifiedConnection, type IdentifiedConnectionSDKType, ConnectionPaths, type ConnectionPathsSDKType, Params, type ParamsSDKType } from './connection.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * GenesisState defines the ibc connection submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.GenesisState
 */
export interface GenesisState {
    connections: IdentifiedConnection[];
    clientConnectionPaths: ConnectionPaths[];
    /**
     * the sequence for the next generated connection identifier
     */
    nextConnectionSequence: bigint;
    params: Params;
}
export interface GenesisStateProtoMsg {
    typeUrl: '/ibc.core.connection.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the ibc connection submodule's genesis state.
 * @name GenesisStateSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.GenesisState
 */
export interface GenesisStateSDKType {
    connections: IdentifiedConnectionSDKType[];
    client_connection_paths: ConnectionPathsSDKType[];
    next_connection_sequence: bigint;
    params: ParamsSDKType;
}
/**
 * GenesisState defines the ibc connection submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/ibc.core.connection.v1.GenesisState";
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
//# sourceMappingURL=genesis.d.ts.map