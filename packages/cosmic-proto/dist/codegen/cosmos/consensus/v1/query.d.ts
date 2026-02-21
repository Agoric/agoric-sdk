import { ConsensusParams, type ConsensusParamsSDKType } from '../../../tendermint/types/params.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryParamsRequest defines the request type for querying x/consensus parameters.
 * @name QueryParamsRequest
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/cosmos.consensus.v1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest defines the request type for querying x/consensus parameters.
 * @name QueryParamsRequestSDKType
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse defines the response type for querying x/consensus parameters.
 * @name QueryParamsResponse
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params are the tendermint consensus params stored in the consensus module.
     * Please note that `params.version` is not populated in this response, it is
     * tracked separately in the x/upgrade module.
     */
    params?: ConsensusParams;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/cosmos.consensus.v1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse defines the response type for querying x/consensus parameters.
 * @name QueryParamsResponseSDKType
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params?: ConsensusParamsSDKType;
}
/**
 * QueryParamsRequest defines the request type for querying x/consensus parameters.
 * @name QueryParamsRequest
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/cosmos.consensus.v1.QueryParamsRequest";
    aminoType: "cosmos-sdk/QueryParamsRequest";
    is(o: any): o is QueryParamsRequest;
    isSDK(o: any): o is QueryParamsRequestSDKType;
    encode(_: QueryParamsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsRequest;
    fromJSON(_: any): QueryParamsRequest;
    toJSON(_: QueryParamsRequest): JsonSafe<QueryParamsRequest>;
    fromPartial(_: Partial<QueryParamsRequest>): QueryParamsRequest;
    fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest;
    toProto(message: QueryParamsRequest): Uint8Array;
    toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsResponse defines the response type for querying x/consensus parameters.
 * @name QueryParamsResponse
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/cosmos.consensus.v1.QueryParamsResponse";
    aminoType: "cosmos-sdk/QueryParamsResponse";
    is(o: any): o is QueryParamsResponse;
    isSDK(o: any): o is QueryParamsResponseSDKType;
    encode(message: QueryParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsResponse;
    fromJSON(object: any): QueryParamsResponse;
    toJSON(message: QueryParamsResponse): JsonSafe<QueryParamsResponse>;
    fromPartial(object: Partial<QueryParamsResponse>): QueryParamsResponse;
    fromProtoMsg(message: QueryParamsResponseProtoMsg): QueryParamsResponse;
    toProto(message: QueryParamsResponse): Uint8Array;
    toProtoMsg(message: QueryParamsResponse): QueryParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map