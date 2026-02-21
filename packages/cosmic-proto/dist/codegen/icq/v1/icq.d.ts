import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * Params defines the set of on-chain interchain query parameters.
 * @name Params
 * @package icq.v1
 * @see proto type: icq.v1.Params
 */
export interface Params {
    /**
     * host_enabled enables or disables the host submodule.
     */
    hostEnabled: boolean;
    /**
     * allow_queries defines a list of query paths allowed to be queried on a host chain.
     */
    allowQueries: string[];
}
export interface ParamsProtoMsg {
    typeUrl: '/icq.v1.Params';
    value: Uint8Array;
}
/**
 * Params defines the set of on-chain interchain query parameters.
 * @name ParamsSDKType
 * @package icq.v1
 * @see proto type: icq.v1.Params
 */
export interface ParamsSDKType {
    host_enabled: boolean;
    allow_queries: string[];
}
/**
 * Params defines the set of on-chain interchain query parameters.
 * @name Params
 * @package icq.v1
 * @see proto type: icq.v1.Params
 */
export declare const Params: {
    typeUrl: "/icq.v1.Params";
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
//# sourceMappingURL=icq.d.ts.map