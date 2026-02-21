import { Timestamp, type TimestampSDKType } from '../../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * ConfigRequest defines the request structure for the Config gRPC query.
 * @name ConfigRequest
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.ConfigRequest
 */
export interface ConfigRequest {
}
export interface ConfigRequestProtoMsg {
    typeUrl: '/cosmos.base.node.v1beta1.ConfigRequest';
    value: Uint8Array;
}
/**
 * ConfigRequest defines the request structure for the Config gRPC query.
 * @name ConfigRequestSDKType
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.ConfigRequest
 */
export interface ConfigRequestSDKType {
}
/**
 * ConfigResponse defines the response structure for the Config gRPC query.
 * @name ConfigResponse
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.ConfigResponse
 */
export interface ConfigResponse {
    minimumGasPrice: string;
    pruningKeepRecent: string;
    pruningInterval: string;
    haltHeight: bigint;
}
export interface ConfigResponseProtoMsg {
    typeUrl: '/cosmos.base.node.v1beta1.ConfigResponse';
    value: Uint8Array;
}
/**
 * ConfigResponse defines the response structure for the Config gRPC query.
 * @name ConfigResponseSDKType
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.ConfigResponse
 */
export interface ConfigResponseSDKType {
    minimum_gas_price: string;
    pruning_keep_recent: string;
    pruning_interval: string;
    halt_height: bigint;
}
/**
 * StateRequest defines the request structure for the status of a node.
 * @name StatusRequest
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.StatusRequest
 */
export interface StatusRequest {
}
export interface StatusRequestProtoMsg {
    typeUrl: '/cosmos.base.node.v1beta1.StatusRequest';
    value: Uint8Array;
}
/**
 * StateRequest defines the request structure for the status of a node.
 * @name StatusRequestSDKType
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.StatusRequest
 */
export interface StatusRequestSDKType {
}
/**
 * StateResponse defines the response structure for the status of a node.
 * @name StatusResponse
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.StatusResponse
 */
export interface StatusResponse {
    /**
     * earliest block height available in the store
     */
    earliestStoreHeight: bigint;
    /**
     * current block height
     */
    height: bigint;
    /**
     * block height timestamp
     */
    timestamp?: Timestamp;
    /**
     * app hash of the current block
     */
    appHash: Uint8Array;
    /**
     * validator hash provided by the consensus header
     */
    validatorHash: Uint8Array;
}
export interface StatusResponseProtoMsg {
    typeUrl: '/cosmos.base.node.v1beta1.StatusResponse';
    value: Uint8Array;
}
/**
 * StateResponse defines the response structure for the status of a node.
 * @name StatusResponseSDKType
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.StatusResponse
 */
export interface StatusResponseSDKType {
    earliest_store_height: bigint;
    height: bigint;
    timestamp?: TimestampSDKType;
    app_hash: Uint8Array;
    validator_hash: Uint8Array;
}
/**
 * ConfigRequest defines the request structure for the Config gRPC query.
 * @name ConfigRequest
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.ConfigRequest
 */
export declare const ConfigRequest: {
    typeUrl: "/cosmos.base.node.v1beta1.ConfigRequest";
    aminoType: "cosmos-sdk/ConfigRequest";
    is(o: any): o is ConfigRequest;
    isSDK(o: any): o is ConfigRequestSDKType;
    encode(_: ConfigRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConfigRequest;
    fromJSON(_: any): ConfigRequest;
    toJSON(_: ConfigRequest): JsonSafe<ConfigRequest>;
    fromPartial(_: Partial<ConfigRequest>): ConfigRequest;
    fromProtoMsg(message: ConfigRequestProtoMsg): ConfigRequest;
    toProto(message: ConfigRequest): Uint8Array;
    toProtoMsg(message: ConfigRequest): ConfigRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ConfigResponse defines the response structure for the Config gRPC query.
 * @name ConfigResponse
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.ConfigResponse
 */
export declare const ConfigResponse: {
    typeUrl: "/cosmos.base.node.v1beta1.ConfigResponse";
    aminoType: "cosmos-sdk/ConfigResponse";
    is(o: any): o is ConfigResponse;
    isSDK(o: any): o is ConfigResponseSDKType;
    encode(message: ConfigResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConfigResponse;
    fromJSON(object: any): ConfigResponse;
    toJSON(message: ConfigResponse): JsonSafe<ConfigResponse>;
    fromPartial(object: Partial<ConfigResponse>): ConfigResponse;
    fromProtoMsg(message: ConfigResponseProtoMsg): ConfigResponse;
    toProto(message: ConfigResponse): Uint8Array;
    toProtoMsg(message: ConfigResponse): ConfigResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * StateRequest defines the request structure for the status of a node.
 * @name StatusRequest
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.StatusRequest
 */
export declare const StatusRequest: {
    typeUrl: "/cosmos.base.node.v1beta1.StatusRequest";
    aminoType: "cosmos-sdk/StatusRequest";
    is(o: any): o is StatusRequest;
    isSDK(o: any): o is StatusRequestSDKType;
    encode(_: StatusRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): StatusRequest;
    fromJSON(_: any): StatusRequest;
    toJSON(_: StatusRequest): JsonSafe<StatusRequest>;
    fromPartial(_: Partial<StatusRequest>): StatusRequest;
    fromProtoMsg(message: StatusRequestProtoMsg): StatusRequest;
    toProto(message: StatusRequest): Uint8Array;
    toProtoMsg(message: StatusRequest): StatusRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * StateResponse defines the response structure for the status of a node.
 * @name StatusResponse
 * @package cosmos.base.node.v1beta1
 * @see proto type: cosmos.base.node.v1beta1.StatusResponse
 */
export declare const StatusResponse: {
    typeUrl: "/cosmos.base.node.v1beta1.StatusResponse";
    aminoType: "cosmos-sdk/StatusResponse";
    is(o: any): o is StatusResponse;
    isSDK(o: any): o is StatusResponseSDKType;
    encode(message: StatusResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): StatusResponse;
    fromJSON(object: any): StatusResponse;
    toJSON(message: StatusResponse): JsonSafe<StatusResponse>;
    fromPartial(object: Partial<StatusResponse>): StatusResponse;
    fromProtoMsg(message: StatusResponseProtoMsg): StatusResponse;
    toProto(message: StatusResponse): Uint8Array;
    toProtoMsg(message: StatusResponse): StatusResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map