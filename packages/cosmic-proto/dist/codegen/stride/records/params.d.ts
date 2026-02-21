import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * Params defines the parameters for the module.
 * @name Params
 * @package stride.records
 * @see proto type: stride.records.Params
 */
export interface Params {
}
export interface ParamsProtoMsg {
    typeUrl: '/stride.records.Params';
    value: Uint8Array;
}
/**
 * Params defines the parameters for the module.
 * @name ParamsSDKType
 * @package stride.records
 * @see proto type: stride.records.Params
 */
export interface ParamsSDKType {
}
/**
 * Params defines the parameters for the module.
 * @name Params
 * @package stride.records
 * @see proto type: stride.records.Params
 */
export declare const Params: {
    typeUrl: "/stride.records.Params";
    is(o: any): o is Params;
    isSDK(o: any): o is ParamsSDKType;
    encode(_: Params, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Params;
    fromJSON(_: any): Params;
    toJSON(_: Params): JsonSafe<Params>;
    fromPartial(_: Partial<Params>): Params;
    fromProtoMsg(message: ParamsProtoMsg): Params;
    toProto(message: Params): Uint8Array;
    toProtoMsg(message: Params): ParamsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=params.d.ts.map