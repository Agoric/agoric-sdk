import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Coin defines a token with a denomination and an amount.
 *
 * NOTE: The amount field is an Int which implements the custom method
 * signatures required by gogoproto.
 * @name Coin
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.Coin
 */
export interface Coin {
    denom: string;
    amount: string;
}
export interface CoinProtoMsg {
    typeUrl: '/cosmos.base.v1beta1.Coin';
    value: Uint8Array;
}
/**
 * Coin defines a token with a denomination and an amount.
 *
 * NOTE: The amount field is an Int which implements the custom method
 * signatures required by gogoproto.
 * @name CoinSDKType
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.Coin
 */
export interface CoinSDKType {
    denom: string;
    amount: string;
}
/**
 * DecCoin defines a token with a denomination and a decimal amount.
 *
 * NOTE: The amount field is an Dec which implements the custom method
 * signatures required by gogoproto.
 * @name DecCoin
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecCoin
 */
export interface DecCoin {
    denom: string;
    amount: string;
}
export interface DecCoinProtoMsg {
    typeUrl: '/cosmos.base.v1beta1.DecCoin';
    value: Uint8Array;
}
/**
 * DecCoin defines a token with a denomination and a decimal amount.
 *
 * NOTE: The amount field is an Dec which implements the custom method
 * signatures required by gogoproto.
 * @name DecCoinSDKType
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecCoin
 */
export interface DecCoinSDKType {
    denom: string;
    amount: string;
}
/**
 * IntProto defines a Protobuf wrapper around an Int object.
 * Deprecated: Prefer to use math.Int directly. It supports binary Marshal and Unmarshal.
 * @name IntProto
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.IntProto
 */
export interface IntProto {
    int: string;
}
export interface IntProtoProtoMsg {
    typeUrl: '/cosmos.base.v1beta1.IntProto';
    value: Uint8Array;
}
/**
 * IntProto defines a Protobuf wrapper around an Int object.
 * Deprecated: Prefer to use math.Int directly. It supports binary Marshal and Unmarshal.
 * @name IntProtoSDKType
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.IntProto
 */
export interface IntProtoSDKType {
    int: string;
}
/**
 * DecProto defines a Protobuf wrapper around a Dec object.
 * Deprecated: Prefer to use math.LegacyDec directly. It supports binary Marshal and Unmarshal.
 * @name DecProto
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecProto
 */
export interface DecProto {
    dec: string;
}
export interface DecProtoProtoMsg {
    typeUrl: '/cosmos.base.v1beta1.DecProto';
    value: Uint8Array;
}
/**
 * DecProto defines a Protobuf wrapper around a Dec object.
 * Deprecated: Prefer to use math.LegacyDec directly. It supports binary Marshal and Unmarshal.
 * @name DecProtoSDKType
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecProto
 */
export interface DecProtoSDKType {
    dec: string;
}
/**
 * Coin defines a token with a denomination and an amount.
 *
 * NOTE: The amount field is an Int which implements the custom method
 * signatures required by gogoproto.
 * @name Coin
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.Coin
 */
export declare const Coin: {
    typeUrl: "/cosmos.base.v1beta1.Coin";
    aminoType: "cosmos-sdk/Coin";
    is(o: any): o is Coin;
    isSDK(o: any): o is CoinSDKType;
    encode(message: Coin, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Coin;
    fromJSON(object: any): Coin;
    toJSON(message: Coin): JsonSafe<Coin>;
    fromPartial(object: Partial<Coin>): Coin;
    fromProtoMsg(message: CoinProtoMsg): Coin;
    toProto(message: Coin): Uint8Array;
    toProtoMsg(message: Coin): CoinProtoMsg;
    registerTypeUrl(): void;
};
/**
 * DecCoin defines a token with a denomination and a decimal amount.
 *
 * NOTE: The amount field is an Dec which implements the custom method
 * signatures required by gogoproto.
 * @name DecCoin
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecCoin
 */
export declare const DecCoin: {
    typeUrl: "/cosmos.base.v1beta1.DecCoin";
    aminoType: "cosmos-sdk/DecCoin";
    is(o: any): o is DecCoin;
    isSDK(o: any): o is DecCoinSDKType;
    encode(message: DecCoin, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DecCoin;
    fromJSON(object: any): DecCoin;
    toJSON(message: DecCoin): JsonSafe<DecCoin>;
    fromPartial(object: Partial<DecCoin>): DecCoin;
    fromProtoMsg(message: DecCoinProtoMsg): DecCoin;
    toProto(message: DecCoin): Uint8Array;
    toProtoMsg(message: DecCoin): DecCoinProtoMsg;
    registerTypeUrl(): void;
};
/**
 * IntProto defines a Protobuf wrapper around an Int object.
 * Deprecated: Prefer to use math.Int directly. It supports binary Marshal and Unmarshal.
 * @name IntProto
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.IntProto
 */
export declare const IntProto: {
    typeUrl: "/cosmos.base.v1beta1.IntProto";
    aminoType: "cosmos-sdk/IntProto";
    is(o: any): o is IntProto;
    isSDK(o: any): o is IntProtoSDKType;
    encode(message: IntProto, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): IntProto;
    fromJSON(object: any): IntProto;
    toJSON(message: IntProto): JsonSafe<IntProto>;
    fromPartial(object: Partial<IntProto>): IntProto;
    fromProtoMsg(message: IntProtoProtoMsg): IntProto;
    toProto(message: IntProto): Uint8Array;
    toProtoMsg(message: IntProto): IntProtoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * DecProto defines a Protobuf wrapper around a Dec object.
 * Deprecated: Prefer to use math.LegacyDec directly. It supports binary Marshal and Unmarshal.
 * @name DecProto
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecProto
 */
export declare const DecProto: {
    typeUrl: "/cosmos.base.v1beta1.DecProto";
    aminoType: "cosmos-sdk/DecProto";
    is(o: any): o is DecProto;
    isSDK(o: any): o is DecProtoSDKType;
    encode(message: DecProto, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DecProto;
    fromJSON(object: any): DecProto;
    toJSON(message: DecProto): JsonSafe<DecProto>;
    fromPartial(object: Partial<DecProto>): DecProto;
    fromProtoMsg(message: DecProtoProtoMsg): DecProto;
    toProto(message: DecProto): Uint8Array;
    toProtoMsg(message: DecProto): DecProtoProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=coin.d.ts.map