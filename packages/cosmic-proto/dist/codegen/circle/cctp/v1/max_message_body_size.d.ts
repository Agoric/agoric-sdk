import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 * @name MaxMessageBodySize
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MaxMessageBodySize
 */
export interface MaxMessageBodySize {
    amount: bigint;
}
export interface MaxMessageBodySizeProtoMsg {
    typeUrl: '/circle.cctp.v1.MaxMessageBodySize';
    value: Uint8Array;
}
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 * @name MaxMessageBodySizeSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MaxMessageBodySize
 */
export interface MaxMessageBodySizeSDKType {
    amount: bigint;
}
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 * @name MaxMessageBodySize
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MaxMessageBodySize
 */
export declare const MaxMessageBodySize: {
    typeUrl: "/circle.cctp.v1.MaxMessageBodySize";
    is(o: any): o is MaxMessageBodySize;
    isSDK(o: any): o is MaxMessageBodySizeSDKType;
    encode(message: MaxMessageBodySize, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MaxMessageBodySize;
    fromJSON(object: any): MaxMessageBodySize;
    toJSON(message: MaxMessageBodySize): JsonSafe<MaxMessageBodySize>;
    fromPartial(object: Partial<MaxMessageBodySize>): MaxMessageBodySize;
    fromProtoMsg(message: MaxMessageBodySizeProtoMsg): MaxMessageBodySize;
    toProto(message: MaxMessageBodySize): Uint8Array;
    toProtoMsg(message: MaxMessageBodySize): MaxMessageBodySizeProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=max_message_body_size.d.ts.map