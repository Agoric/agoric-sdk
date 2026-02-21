import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * Params defines the set of on-chain interchain accounts parameters.
 * The following parameters may be used to disable the host submodule.
 * @name Params
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.Params
 */
export interface Params {
    /**
     * host_enabled enables or disables the host submodule.
     */
    hostEnabled: boolean;
    /**
     * allow_messages defines a list of sdk message typeURLs allowed to be executed on a host chain.
     */
    allowMessages: string[];
}
export interface ParamsProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.host.v1.Params';
    value: Uint8Array;
}
/**
 * Params defines the set of on-chain interchain accounts parameters.
 * The following parameters may be used to disable the host submodule.
 * @name ParamsSDKType
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.Params
 */
export interface ParamsSDKType {
    host_enabled: boolean;
    allow_messages: string[];
}
/**
 * QueryRequest defines the parameters for a particular query request
 * by an interchain account.
 * @name QueryRequest
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryRequest
 */
export interface QueryRequest {
    /**
     * path defines the path of the query request as defined by ADR-021.
     * https://github.com/cosmos/cosmos-sdk/blob/main/docs/architecture/adr-021-protobuf-query-encoding.md#custom-query-registration-and-routing
     */
    path: string;
    /**
     * data defines the payload of the query request as defined by ADR-021.
     * https://github.com/cosmos/cosmos-sdk/blob/main/docs/architecture/adr-021-protobuf-query-encoding.md#custom-query-registration-and-routing
     */
    data: Uint8Array;
}
export interface QueryRequestProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.host.v1.QueryRequest';
    value: Uint8Array;
}
/**
 * QueryRequest defines the parameters for a particular query request
 * by an interchain account.
 * @name QueryRequestSDKType
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryRequest
 */
export interface QueryRequestSDKType {
    path: string;
    data: Uint8Array;
}
/**
 * Params defines the set of on-chain interchain accounts parameters.
 * The following parameters may be used to disable the host submodule.
 * @name Params
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.Params
 */
export declare const Params: {
    typeUrl: "/ibc.applications.interchain_accounts.host.v1.Params";
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
/**
 * QueryRequest defines the parameters for a particular query request
 * by an interchain account.
 * @name QueryRequest
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryRequest
 */
export declare const QueryRequest: {
    typeUrl: "/ibc.applications.interchain_accounts.host.v1.QueryRequest";
    aminoType: "cosmos-sdk/QueryRequest";
    is(o: any): o is QueryRequest;
    isSDK(o: any): o is QueryRequestSDKType;
    encode(message: QueryRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRequest;
    fromJSON(object: any): QueryRequest;
    toJSON(message: QueryRequest): JsonSafe<QueryRequest>;
    fromPartial(object: Partial<QueryRequest>): QueryRequest;
    fromProtoMsg(message: QueryRequestProtoMsg): QueryRequest;
    toProto(message: QueryRequest): Uint8Array;
    toProtoMsg(message: QueryRequest): QueryRequestProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=host.d.ts.map