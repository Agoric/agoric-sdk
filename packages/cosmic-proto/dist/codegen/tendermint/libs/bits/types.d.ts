import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * @name BitArray
 * @package tendermint.libs.bits
 * @see proto type: tendermint.libs.bits.BitArray
 */
export interface BitArray {
    bits: bigint;
    elems: bigint[];
}
export interface BitArrayProtoMsg {
    typeUrl: '/tendermint.libs.bits.BitArray';
    value: Uint8Array;
}
/**
 * @name BitArraySDKType
 * @package tendermint.libs.bits
 * @see proto type: tendermint.libs.bits.BitArray
 */
export interface BitArraySDKType {
    bits: bigint;
    elems: bigint[];
}
/**
 * @name BitArray
 * @package tendermint.libs.bits
 * @see proto type: tendermint.libs.bits.BitArray
 */
export declare const BitArray: {
    typeUrl: "/tendermint.libs.bits.BitArray";
    is(o: any): o is BitArray;
    isSDK(o: any): o is BitArraySDKType;
    encode(message: BitArray, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BitArray;
    fromJSON(object: any): BitArray;
    toJSON(message: BitArray): JsonSafe<BitArray>;
    fromPartial(object: Partial<BitArray>): BitArray;
    fromProtoMsg(message: BitArrayProtoMsg): BitArray;
    toProto(message: BitArray): Uint8Array;
    toProtoMsg(message: BitArray): BitArrayProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=types.d.ts.map