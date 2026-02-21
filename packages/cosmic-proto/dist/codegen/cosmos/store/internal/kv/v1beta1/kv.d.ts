import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * Pairs defines a repeated slice of Pair objects.
 * @name Pairs
 * @package cosmos.store.internal.kv.v1beta1
 * @see proto type: cosmos.store.internal.kv.v1beta1.Pairs
 */
export interface Pairs {
    pairs: Pair[];
}
export interface PairsProtoMsg {
    typeUrl: '/cosmos.store.internal.kv.v1beta1.Pairs';
    value: Uint8Array;
}
/**
 * Pairs defines a repeated slice of Pair objects.
 * @name PairsSDKType
 * @package cosmos.store.internal.kv.v1beta1
 * @see proto type: cosmos.store.internal.kv.v1beta1.Pairs
 */
export interface PairsSDKType {
    pairs: PairSDKType[];
}
/**
 * Pair defines a key/value bytes tuple.
 * @name Pair
 * @package cosmos.store.internal.kv.v1beta1
 * @see proto type: cosmos.store.internal.kv.v1beta1.Pair
 */
export interface Pair {
    key: Uint8Array;
    value: Uint8Array;
}
export interface PairProtoMsg {
    typeUrl: '/cosmos.store.internal.kv.v1beta1.Pair';
    value: Uint8Array;
}
/**
 * Pair defines a key/value bytes tuple.
 * @name PairSDKType
 * @package cosmos.store.internal.kv.v1beta1
 * @see proto type: cosmos.store.internal.kv.v1beta1.Pair
 */
export interface PairSDKType {
    key: Uint8Array;
    value: Uint8Array;
}
/**
 * Pairs defines a repeated slice of Pair objects.
 * @name Pairs
 * @package cosmos.store.internal.kv.v1beta1
 * @see proto type: cosmos.store.internal.kv.v1beta1.Pairs
 */
export declare const Pairs: {
    typeUrl: "/cosmos.store.internal.kv.v1beta1.Pairs";
    aminoType: "cosmos-sdk/Pairs";
    is(o: any): o is Pairs;
    isSDK(o: any): o is PairsSDKType;
    encode(message: Pairs, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Pairs;
    fromJSON(object: any): Pairs;
    toJSON(message: Pairs): JsonSafe<Pairs>;
    fromPartial(object: Partial<Pairs>): Pairs;
    fromProtoMsg(message: PairsProtoMsg): Pairs;
    toProto(message: Pairs): Uint8Array;
    toProtoMsg(message: Pairs): PairsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Pair defines a key/value bytes tuple.
 * @name Pair
 * @package cosmos.store.internal.kv.v1beta1
 * @see proto type: cosmos.store.internal.kv.v1beta1.Pair
 */
export declare const Pair: {
    typeUrl: "/cosmos.store.internal.kv.v1beta1.Pair";
    aminoType: "cosmos-sdk/Pair";
    is(o: any): o is Pair;
    isSDK(o: any): o is PairSDKType;
    encode(message: Pair, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Pair;
    fromJSON(object: any): Pair;
    toJSON(message: Pair): JsonSafe<Pair>;
    fromPartial(object: Partial<Pair>): Pair;
    fromProtoMsg(message: PairProtoMsg): Pair;
    toProto(message: Pair): Uint8Array;
    toProtoMsg(message: Pair): PairProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=kv.d.ts.map