import { RequestQuery, type RequestQuerySDKType, ResponseQuery, type ResponseQuerySDKType } from '../../tendermint/abci/types.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * InterchainQueryPacketData is comprised of raw query.
 * @name InterchainQueryPacketData
 * @package icq.v1
 * @see proto type: icq.v1.InterchainQueryPacketData
 */
export interface InterchainQueryPacketData {
    data: Uint8Array;
    /**
     * optional memo
     */
    memo: string;
}
export interface InterchainQueryPacketDataProtoMsg {
    typeUrl: '/icq.v1.InterchainQueryPacketData';
    value: Uint8Array;
}
/**
 * InterchainQueryPacketData is comprised of raw query.
 * @name InterchainQueryPacketDataSDKType
 * @package icq.v1
 * @see proto type: icq.v1.InterchainQueryPacketData
 */
export interface InterchainQueryPacketDataSDKType {
    data: Uint8Array;
    memo: string;
}
/**
 * InterchainQueryPacketAck is comprised of an ABCI query response with non-deterministic fields left empty (e.g. Codespace, Log, Info and ...).
 * @name InterchainQueryPacketAck
 * @package icq.v1
 * @see proto type: icq.v1.InterchainQueryPacketAck
 */
export interface InterchainQueryPacketAck {
    data: Uint8Array;
}
export interface InterchainQueryPacketAckProtoMsg {
    typeUrl: '/icq.v1.InterchainQueryPacketAck';
    value: Uint8Array;
}
/**
 * InterchainQueryPacketAck is comprised of an ABCI query response with non-deterministic fields left empty (e.g. Codespace, Log, Info and ...).
 * @name InterchainQueryPacketAckSDKType
 * @package icq.v1
 * @see proto type: icq.v1.InterchainQueryPacketAck
 */
export interface InterchainQueryPacketAckSDKType {
    data: Uint8Array;
}
/**
 * CosmosQuery contains a list of tendermint ABCI query requests. It should be used when sending queries to an SDK host chain.
 * @name CosmosQuery
 * @package icq.v1
 * @see proto type: icq.v1.CosmosQuery
 */
export interface CosmosQuery {
    requests: RequestQuery[];
}
export interface CosmosQueryProtoMsg {
    typeUrl: '/icq.v1.CosmosQuery';
    value: Uint8Array;
}
/**
 * CosmosQuery contains a list of tendermint ABCI query requests. It should be used when sending queries to an SDK host chain.
 * @name CosmosQuerySDKType
 * @package icq.v1
 * @see proto type: icq.v1.CosmosQuery
 */
export interface CosmosQuerySDKType {
    requests: RequestQuerySDKType[];
}
/**
 * CosmosResponse contains a list of tendermint ABCI query responses. It should be used when receiving responses from an SDK host chain.
 * @name CosmosResponse
 * @package icq.v1
 * @see proto type: icq.v1.CosmosResponse
 */
export interface CosmosResponse {
    responses: ResponseQuery[];
}
export interface CosmosResponseProtoMsg {
    typeUrl: '/icq.v1.CosmosResponse';
    value: Uint8Array;
}
/**
 * CosmosResponse contains a list of tendermint ABCI query responses. It should be used when receiving responses from an SDK host chain.
 * @name CosmosResponseSDKType
 * @package icq.v1
 * @see proto type: icq.v1.CosmosResponse
 */
export interface CosmosResponseSDKType {
    responses: ResponseQuerySDKType[];
}
/**
 * InterchainQueryPacketData is comprised of raw query.
 * @name InterchainQueryPacketData
 * @package icq.v1
 * @see proto type: icq.v1.InterchainQueryPacketData
 */
export declare const InterchainQueryPacketData: {
    typeUrl: "/icq.v1.InterchainQueryPacketData";
    is(o: any): o is InterchainQueryPacketData;
    isSDK(o: any): o is InterchainQueryPacketDataSDKType;
    encode(message: InterchainQueryPacketData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): InterchainQueryPacketData;
    fromJSON(object: any): InterchainQueryPacketData;
    toJSON(message: InterchainQueryPacketData): JsonSafe<InterchainQueryPacketData>;
    fromPartial(object: Partial<InterchainQueryPacketData>): InterchainQueryPacketData;
    fromProtoMsg(message: InterchainQueryPacketDataProtoMsg): InterchainQueryPacketData;
    toProto(message: InterchainQueryPacketData): Uint8Array;
    toProtoMsg(message: InterchainQueryPacketData): InterchainQueryPacketDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * InterchainQueryPacketAck is comprised of an ABCI query response with non-deterministic fields left empty (e.g. Codespace, Log, Info and ...).
 * @name InterchainQueryPacketAck
 * @package icq.v1
 * @see proto type: icq.v1.InterchainQueryPacketAck
 */
export declare const InterchainQueryPacketAck: {
    typeUrl: "/icq.v1.InterchainQueryPacketAck";
    is(o: any): o is InterchainQueryPacketAck;
    isSDK(o: any): o is InterchainQueryPacketAckSDKType;
    encode(message: InterchainQueryPacketAck, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): InterchainQueryPacketAck;
    fromJSON(object: any): InterchainQueryPacketAck;
    toJSON(message: InterchainQueryPacketAck): JsonSafe<InterchainQueryPacketAck>;
    fromPartial(object: Partial<InterchainQueryPacketAck>): InterchainQueryPacketAck;
    fromProtoMsg(message: InterchainQueryPacketAckProtoMsg): InterchainQueryPacketAck;
    toProto(message: InterchainQueryPacketAck): Uint8Array;
    toProtoMsg(message: InterchainQueryPacketAck): InterchainQueryPacketAckProtoMsg;
    registerTypeUrl(): void;
};
/**
 * CosmosQuery contains a list of tendermint ABCI query requests. It should be used when sending queries to an SDK host chain.
 * @name CosmosQuery
 * @package icq.v1
 * @see proto type: icq.v1.CosmosQuery
 */
export declare const CosmosQuery: {
    typeUrl: "/icq.v1.CosmosQuery";
    is(o: any): o is CosmosQuery;
    isSDK(o: any): o is CosmosQuerySDKType;
    encode(message: CosmosQuery, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CosmosQuery;
    fromJSON(object: any): CosmosQuery;
    toJSON(message: CosmosQuery): JsonSafe<CosmosQuery>;
    fromPartial(object: Partial<CosmosQuery>): CosmosQuery;
    fromProtoMsg(message: CosmosQueryProtoMsg): CosmosQuery;
    toProto(message: CosmosQuery): Uint8Array;
    toProtoMsg(message: CosmosQuery): CosmosQueryProtoMsg;
    registerTypeUrl(): void;
};
/**
 * CosmosResponse contains a list of tendermint ABCI query responses. It should be used when receiving responses from an SDK host chain.
 * @name CosmosResponse
 * @package icq.v1
 * @see proto type: icq.v1.CosmosResponse
 */
export declare const CosmosResponse: {
    typeUrl: "/icq.v1.CosmosResponse";
    is(o: any): o is CosmosResponse;
    isSDK(o: any): o is CosmosResponseSDKType;
    encode(message: CosmosResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CosmosResponse;
    fromJSON(object: any): CosmosResponse;
    toJSON(message: CosmosResponse): JsonSafe<CosmosResponse>;
    fromPartial(object: Partial<CosmosResponse>): CosmosResponse;
    fromProtoMsg(message: CosmosResponseProtoMsg): CosmosResponse;
    toProto(message: CosmosResponse): Uint8Array;
    toProtoMsg(message: CosmosResponse): CosmosResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=packet.d.ts.map