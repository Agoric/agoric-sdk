import { Coin, type CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * @name Route
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.Route
 */
export interface Route {
    /**
     * ID of the Pool.
     */
    poolId: bigint;
    /**
     * Destination denom after the Swap in the Pool.
     */
    denomTo: string;
}
export interface RouteProtoMsg {
    typeUrl: '/noble.swap.v1.Route';
    value: Uint8Array;
}
/**
 * @name RouteSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.Route
 */
export interface RouteSDKType {
    pool_id: bigint;
    denom_to: string;
}
/**
 * @name Swap
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.Swap
 */
export interface Swap {
    /**
     * ID of the pool used in the swap.
     */
    poolId: bigint;
    /**
     * The input coin for the swap.
     */
    in: Coin;
    /**
     * The output coin after the swap.
     */
    out: Coin;
    /**
     * Any fees incurred during the swap.
     */
    fees: Coin[];
}
export interface SwapProtoMsg {
    typeUrl: '/noble.swap.v1.Swap';
    value: Uint8Array;
}
/**
 * @name SwapSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.Swap
 */
export interface SwapSDKType {
    pool_id: bigint;
    in: CoinSDKType;
    out: CoinSDKType;
    fees: CoinSDKType[];
}
/**
 * @name Route
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.Route
 */
export declare const Route: {
    typeUrl: "/noble.swap.v1.Route";
    is(o: any): o is Route;
    isSDK(o: any): o is RouteSDKType;
    encode(message: Route, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Route;
    fromJSON(object: any): Route;
    toJSON(message: Route): JsonSafe<Route>;
    fromPartial(object: Partial<Route>): Route;
    fromProtoMsg(message: RouteProtoMsg): Route;
    toProto(message: Route): Uint8Array;
    toProtoMsg(message: Route): RouteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Swap
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.Swap
 */
export declare const Swap: {
    typeUrl: "/noble.swap.v1.Swap";
    is(o: any): o is Swap;
    isSDK(o: any): o is SwapSDKType;
    encode(message: Swap, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Swap;
    fromJSON(object: any): Swap;
    toJSON(message: Swap): JsonSafe<Swap>;
    fromPartial(object: Partial<Swap>): Swap;
    fromProtoMsg(message: SwapProtoMsg): Swap;
    toProto(message: Swap): Uint8Array;
    toProtoMsg(message: Swap): SwapProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=swap.d.ts.map