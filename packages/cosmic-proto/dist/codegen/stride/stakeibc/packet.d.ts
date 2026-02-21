import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name StakeibcPacketData
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.StakeibcPacketData
 */
export interface StakeibcPacketData {
    noData?: NoData;
}
export interface StakeibcPacketDataProtoMsg {
    typeUrl: '/stride.stakeibc.StakeibcPacketData';
    value: Uint8Array;
}
/**
 * @name StakeibcPacketDataSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.StakeibcPacketData
 */
export interface StakeibcPacketDataSDKType {
    no_data?: NoDataSDKType;
}
/**
 * @name NoData
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.NoData
 */
export interface NoData {
}
export interface NoDataProtoMsg {
    typeUrl: '/stride.stakeibc.NoData';
    value: Uint8Array;
}
/**
 * @name NoDataSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.NoData
 */
export interface NoDataSDKType {
}
/**
 * @name StakeibcPacketData
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.StakeibcPacketData
 */
export declare const StakeibcPacketData: {
    typeUrl: "/stride.stakeibc.StakeibcPacketData";
    is(o: any): o is StakeibcPacketData;
    isSDK(o: any): o is StakeibcPacketDataSDKType;
    encode(message: StakeibcPacketData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): StakeibcPacketData;
    fromJSON(object: any): StakeibcPacketData;
    toJSON(message: StakeibcPacketData): JsonSafe<StakeibcPacketData>;
    fromPartial(object: Partial<StakeibcPacketData>): StakeibcPacketData;
    fromProtoMsg(message: StakeibcPacketDataProtoMsg): StakeibcPacketData;
    toProto(message: StakeibcPacketData): Uint8Array;
    toProtoMsg(message: StakeibcPacketData): StakeibcPacketDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name NoData
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.NoData
 */
export declare const NoData: {
    typeUrl: "/stride.stakeibc.NoData";
    is(o: any): o is NoData;
    isSDK(o: any): o is NoDataSDKType;
    encode(_: NoData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): NoData;
    fromJSON(_: any): NoData;
    toJSON(_: NoData): JsonSafe<NoData>;
    fromPartial(_: Partial<NoData>): NoData;
    fromProtoMsg(message: NoDataProtoMsg): NoData;
    toProto(message: NoData): Uint8Array;
    toProtoMsg(message: NoData): NoDataProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=packet.d.ts.map