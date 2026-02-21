import { Coin, type CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { Route, type RouteSDKType, Swap, type SwapSDKType } from './swap.js';
import { Algorithm } from './algorithm.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * @name MsgWithdrawProtocolFees
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawProtocolFees
 */
export interface MsgWithdrawProtocolFees {
    /**
     * Address of the signer who is requesting the fee withdrawal.
     */
    signer: string;
    /**
     * Address to which the withdrawn fees will be sent.
     */
    to: string;
}
export interface MsgWithdrawProtocolFeesProtoMsg {
    typeUrl: '/noble.swap.v1.MsgWithdrawProtocolFees';
    value: Uint8Array;
}
/**
 * @name MsgWithdrawProtocolFeesSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawProtocolFees
 */
export interface MsgWithdrawProtocolFeesSDKType {
    signer: string;
    to: string;
}
/**
 * @name MsgWithdrawProtocolFeesResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawProtocolFeesResponse
 */
export interface MsgWithdrawProtocolFeesResponse {
}
export interface MsgWithdrawProtocolFeesResponseProtoMsg {
    typeUrl: '/noble.swap.v1.MsgWithdrawProtocolFeesResponse';
    value: Uint8Array;
}
/**
 * @name MsgWithdrawProtocolFeesResponseSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawProtocolFeesResponse
 */
export interface MsgWithdrawProtocolFeesResponseSDKType {
}
/**
 * @name MsgWithdrawRewards
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawRewards
 */
export interface MsgWithdrawRewards {
    /**
     * Address of the signer who is requesting the reward withdrawal.
     */
    signer: string;
}
export interface MsgWithdrawRewardsProtoMsg {
    typeUrl: '/noble.swap.v1.MsgWithdrawRewards';
    value: Uint8Array;
}
/**
 * @name MsgWithdrawRewardsSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawRewards
 */
export interface MsgWithdrawRewardsSDKType {
    signer: string;
}
/**
 * @name MsgWithdrawRewardsResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawRewardsResponse
 */
export interface MsgWithdrawRewardsResponse {
    /**
     * List of rewards withdrawn by the user.
     */
    rewards: Coin[];
}
export interface MsgWithdrawRewardsResponseProtoMsg {
    typeUrl: '/noble.swap.v1.MsgWithdrawRewardsResponse';
    value: Uint8Array;
}
/**
 * @name MsgWithdrawRewardsResponseSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawRewardsResponse
 */
export interface MsgWithdrawRewardsResponseSDKType {
    rewards: CoinSDKType[];
}
/**
 * @name MsgSwap
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgSwap
 */
export interface MsgSwap {
    /**
     * Address of the signer who is initiating the swap.
     */
    signer: string;
    /**
     * The coin to be swapped.
     */
    amount: Coin;
    /**
     * The routes through which the swap will occur.
     */
    routes: Route[];
    /**
     * The minimum amount of tokens expected after the swap.
     */
    min: Coin;
}
export interface MsgSwapProtoMsg {
    typeUrl: '/noble.swap.v1.MsgSwap';
    value: Uint8Array;
}
/**
 * @name MsgSwapSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgSwap
 */
export interface MsgSwapSDKType {
    signer: string;
    amount: CoinSDKType;
    routes: RouteSDKType[];
    min: CoinSDKType;
}
/**
 * @name MsgSwapResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgSwapResponse
 */
export interface MsgSwapResponse {
    /**
     * The resulting amount of tokens after the swap.
     */
    result: Coin;
    /**
     * Details of each individual swap involved in the process.
     */
    swaps: Swap[];
}
export interface MsgSwapResponseProtoMsg {
    typeUrl: '/noble.swap.v1.MsgSwapResponse';
    value: Uint8Array;
}
/**
 * @name MsgSwapResponseSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgSwapResponse
 */
export interface MsgSwapResponseSDKType {
    result: CoinSDKType;
    swaps: SwapSDKType[];
}
/**
 * @name MsgPauseByAlgorithm
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByAlgorithm
 */
export interface MsgPauseByAlgorithm {
    /**
     * Address of the signer who is requesting to pause the pools.
     */
    signer: string;
    /**
     * The algorithm used by the pools to be paused.
     */
    algorithm: Algorithm;
}
export interface MsgPauseByAlgorithmProtoMsg {
    typeUrl: '/noble.swap.v1.MsgPauseByAlgorithm';
    value: Uint8Array;
}
/**
 * @name MsgPauseByAlgorithmSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByAlgorithm
 */
export interface MsgPauseByAlgorithmSDKType {
    signer: string;
    algorithm: Algorithm;
}
/**
 * @name MsgPauseByAlgorithmResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByAlgorithmResponse
 */
export interface MsgPauseByAlgorithmResponse {
    /**
     * List of IDs of the paused pools.
     */
    pausedPools: bigint[];
}
export interface MsgPauseByAlgorithmResponseProtoMsg {
    typeUrl: '/noble.swap.v1.MsgPauseByAlgorithmResponse';
    value: Uint8Array;
}
/**
 * @name MsgPauseByAlgorithmResponseSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByAlgorithmResponse
 */
export interface MsgPauseByAlgorithmResponseSDKType {
    paused_pools: bigint[];
}
/**
 * @name MsgPauseByPoolIds
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByPoolIds
 */
export interface MsgPauseByPoolIds {
    /**
     * Address of the signer who is requesting to pause the pools.
     */
    signer: string;
    /**
     * List of IDs of the pools to be paused.
     */
    poolIds: bigint[];
}
export interface MsgPauseByPoolIdsProtoMsg {
    typeUrl: '/noble.swap.v1.MsgPauseByPoolIds';
    value: Uint8Array;
}
/**
 * @name MsgPauseByPoolIdsSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByPoolIds
 */
export interface MsgPauseByPoolIdsSDKType {
    signer: string;
    pool_ids: bigint[];
}
/**
 * @name MsgPauseByPoolIdsResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByPoolIdsResponse
 */
export interface MsgPauseByPoolIdsResponse {
    /**
     * List of IDs of the paused pools.
     */
    pausedPools: bigint[];
}
export interface MsgPauseByPoolIdsResponseProtoMsg {
    typeUrl: '/noble.swap.v1.MsgPauseByPoolIdsResponse';
    value: Uint8Array;
}
/**
 * @name MsgPauseByPoolIdsResponseSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByPoolIdsResponse
 */
export interface MsgPauseByPoolIdsResponseSDKType {
    paused_pools: bigint[];
}
/**
 * @name MsgUnpauseByAlgorithm
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByAlgorithm
 */
export interface MsgUnpauseByAlgorithm {
    /**
     * Address of the signer who is requesting to unpause the pools.
     */
    signer: string;
    /**
     * The algorithm used by the pools to be unpaused.
     */
    algorithm: Algorithm;
}
export interface MsgUnpauseByAlgorithmProtoMsg {
    typeUrl: '/noble.swap.v1.MsgUnpauseByAlgorithm';
    value: Uint8Array;
}
/**
 * @name MsgUnpauseByAlgorithmSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByAlgorithm
 */
export interface MsgUnpauseByAlgorithmSDKType {
    signer: string;
    algorithm: Algorithm;
}
/**
 * @name MsgUnpauseByAlgorithmResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByAlgorithmResponse
 */
export interface MsgUnpauseByAlgorithmResponse {
    /**
     * List of IDs of the unpaused pools.
     */
    unpausedPools: bigint[];
}
export interface MsgUnpauseByAlgorithmResponseProtoMsg {
    typeUrl: '/noble.swap.v1.MsgUnpauseByAlgorithmResponse';
    value: Uint8Array;
}
/**
 * @name MsgUnpauseByAlgorithmResponseSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByAlgorithmResponse
 */
export interface MsgUnpauseByAlgorithmResponseSDKType {
    unpaused_pools: bigint[];
}
/**
 * @name MsgUnpauseByPoolIds
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByPoolIds
 */
export interface MsgUnpauseByPoolIds {
    /**
     * Address of the signer who is requesting to unpause the pools.
     */
    signer: string;
    /**
     * List of IDs of the pools to be unpaused.
     */
    poolIds: bigint[];
}
export interface MsgUnpauseByPoolIdsProtoMsg {
    typeUrl: '/noble.swap.v1.MsgUnpauseByPoolIds';
    value: Uint8Array;
}
/**
 * @name MsgUnpauseByPoolIdsSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByPoolIds
 */
export interface MsgUnpauseByPoolIdsSDKType {
    signer: string;
    pool_ids: bigint[];
}
/**
 * @name MsgUnpauseByPoolIdsResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByPoolIdsResponse
 */
export interface MsgUnpauseByPoolIdsResponse {
    /**
     * List of IDs of the unpaused pools.
     */
    unpausedPools: bigint[];
}
export interface MsgUnpauseByPoolIdsResponseProtoMsg {
    typeUrl: '/noble.swap.v1.MsgUnpauseByPoolIdsResponse';
    value: Uint8Array;
}
/**
 * @name MsgUnpauseByPoolIdsResponseSDKType
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByPoolIdsResponse
 */
export interface MsgUnpauseByPoolIdsResponseSDKType {
    unpaused_pools: bigint[];
}
/**
 * @name MsgWithdrawProtocolFees
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawProtocolFees
 */
export declare const MsgWithdrawProtocolFees: {
    typeUrl: "/noble.swap.v1.MsgWithdrawProtocolFees";
    aminoType: "swap/WithdrawProtocolFees";
    is(o: any): o is MsgWithdrawProtocolFees;
    isSDK(o: any): o is MsgWithdrawProtocolFeesSDKType;
    encode(message: MsgWithdrawProtocolFees, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawProtocolFees;
    fromJSON(object: any): MsgWithdrawProtocolFees;
    toJSON(message: MsgWithdrawProtocolFees): JsonSafe<MsgWithdrawProtocolFees>;
    fromPartial(object: Partial<MsgWithdrawProtocolFees>): MsgWithdrawProtocolFees;
    fromProtoMsg(message: MsgWithdrawProtocolFeesProtoMsg): MsgWithdrawProtocolFees;
    toProto(message: MsgWithdrawProtocolFees): Uint8Array;
    toProtoMsg(message: MsgWithdrawProtocolFees): MsgWithdrawProtocolFeesProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgWithdrawProtocolFeesResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawProtocolFeesResponse
 */
export declare const MsgWithdrawProtocolFeesResponse: {
    typeUrl: "/noble.swap.v1.MsgWithdrawProtocolFeesResponse";
    is(o: any): o is MsgWithdrawProtocolFeesResponse;
    isSDK(o: any): o is MsgWithdrawProtocolFeesResponseSDKType;
    encode(_: MsgWithdrawProtocolFeesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawProtocolFeesResponse;
    fromJSON(_: any): MsgWithdrawProtocolFeesResponse;
    toJSON(_: MsgWithdrawProtocolFeesResponse): JsonSafe<MsgWithdrawProtocolFeesResponse>;
    fromPartial(_: Partial<MsgWithdrawProtocolFeesResponse>): MsgWithdrawProtocolFeesResponse;
    fromProtoMsg(message: MsgWithdrawProtocolFeesResponseProtoMsg): MsgWithdrawProtocolFeesResponse;
    toProto(message: MsgWithdrawProtocolFeesResponse): Uint8Array;
    toProtoMsg(message: MsgWithdrawProtocolFeesResponse): MsgWithdrawProtocolFeesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgWithdrawRewards
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawRewards
 */
export declare const MsgWithdrawRewards: {
    typeUrl: "/noble.swap.v1.MsgWithdrawRewards";
    aminoType: "swap/WithdrawRewards";
    is(o: any): o is MsgWithdrawRewards;
    isSDK(o: any): o is MsgWithdrawRewardsSDKType;
    encode(message: MsgWithdrawRewards, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawRewards;
    fromJSON(object: any): MsgWithdrawRewards;
    toJSON(message: MsgWithdrawRewards): JsonSafe<MsgWithdrawRewards>;
    fromPartial(object: Partial<MsgWithdrawRewards>): MsgWithdrawRewards;
    fromProtoMsg(message: MsgWithdrawRewardsProtoMsg): MsgWithdrawRewards;
    toProto(message: MsgWithdrawRewards): Uint8Array;
    toProtoMsg(message: MsgWithdrawRewards): MsgWithdrawRewardsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgWithdrawRewardsResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgWithdrawRewardsResponse
 */
export declare const MsgWithdrawRewardsResponse: {
    typeUrl: "/noble.swap.v1.MsgWithdrawRewardsResponse";
    is(o: any): o is MsgWithdrawRewardsResponse;
    isSDK(o: any): o is MsgWithdrawRewardsResponseSDKType;
    encode(message: MsgWithdrawRewardsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawRewardsResponse;
    fromJSON(object: any): MsgWithdrawRewardsResponse;
    toJSON(message: MsgWithdrawRewardsResponse): JsonSafe<MsgWithdrawRewardsResponse>;
    fromPartial(object: Partial<MsgWithdrawRewardsResponse>): MsgWithdrawRewardsResponse;
    fromProtoMsg(message: MsgWithdrawRewardsResponseProtoMsg): MsgWithdrawRewardsResponse;
    toProto(message: MsgWithdrawRewardsResponse): Uint8Array;
    toProtoMsg(message: MsgWithdrawRewardsResponse): MsgWithdrawRewardsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgSwap
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgSwap
 */
export declare const MsgSwap: {
    typeUrl: "/noble.swap.v1.MsgSwap";
    aminoType: "swap/Swap";
    is(o: any): o is MsgSwap;
    isSDK(o: any): o is MsgSwapSDKType;
    encode(message: MsgSwap, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSwap;
    fromJSON(object: any): MsgSwap;
    toJSON(message: MsgSwap): JsonSafe<MsgSwap>;
    fromPartial(object: Partial<MsgSwap>): MsgSwap;
    fromProtoMsg(message: MsgSwapProtoMsg): MsgSwap;
    toProto(message: MsgSwap): Uint8Array;
    toProtoMsg(message: MsgSwap): MsgSwapProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgSwapResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgSwapResponse
 */
export declare const MsgSwapResponse: {
    typeUrl: "/noble.swap.v1.MsgSwapResponse";
    is(o: any): o is MsgSwapResponse;
    isSDK(o: any): o is MsgSwapResponseSDKType;
    encode(message: MsgSwapResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSwapResponse;
    fromJSON(object: any): MsgSwapResponse;
    toJSON(message: MsgSwapResponse): JsonSafe<MsgSwapResponse>;
    fromPartial(object: Partial<MsgSwapResponse>): MsgSwapResponse;
    fromProtoMsg(message: MsgSwapResponseProtoMsg): MsgSwapResponse;
    toProto(message: MsgSwapResponse): Uint8Array;
    toProtoMsg(message: MsgSwapResponse): MsgSwapResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgPauseByAlgorithm
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByAlgorithm
 */
export declare const MsgPauseByAlgorithm: {
    typeUrl: "/noble.swap.v1.MsgPauseByAlgorithm";
    aminoType: "swap/PauseByAlgorithm";
    is(o: any): o is MsgPauseByAlgorithm;
    isSDK(o: any): o is MsgPauseByAlgorithmSDKType;
    encode(message: MsgPauseByAlgorithm, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgPauseByAlgorithm;
    fromJSON(object: any): MsgPauseByAlgorithm;
    toJSON(message: MsgPauseByAlgorithm): JsonSafe<MsgPauseByAlgorithm>;
    fromPartial(object: Partial<MsgPauseByAlgorithm>): MsgPauseByAlgorithm;
    fromProtoMsg(message: MsgPauseByAlgorithmProtoMsg): MsgPauseByAlgorithm;
    toProto(message: MsgPauseByAlgorithm): Uint8Array;
    toProtoMsg(message: MsgPauseByAlgorithm): MsgPauseByAlgorithmProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgPauseByAlgorithmResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByAlgorithmResponse
 */
export declare const MsgPauseByAlgorithmResponse: {
    typeUrl: "/noble.swap.v1.MsgPauseByAlgorithmResponse";
    is(o: any): o is MsgPauseByAlgorithmResponse;
    isSDK(o: any): o is MsgPauseByAlgorithmResponseSDKType;
    encode(message: MsgPauseByAlgorithmResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgPauseByAlgorithmResponse;
    fromJSON(object: any): MsgPauseByAlgorithmResponse;
    toJSON(message: MsgPauseByAlgorithmResponse): JsonSafe<MsgPauseByAlgorithmResponse>;
    fromPartial(object: Partial<MsgPauseByAlgorithmResponse>): MsgPauseByAlgorithmResponse;
    fromProtoMsg(message: MsgPauseByAlgorithmResponseProtoMsg): MsgPauseByAlgorithmResponse;
    toProto(message: MsgPauseByAlgorithmResponse): Uint8Array;
    toProtoMsg(message: MsgPauseByAlgorithmResponse): MsgPauseByAlgorithmResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgPauseByPoolIds
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByPoolIds
 */
export declare const MsgPauseByPoolIds: {
    typeUrl: "/noble.swap.v1.MsgPauseByPoolIds";
    aminoType: "swap/PauseByPoolIds";
    is(o: any): o is MsgPauseByPoolIds;
    isSDK(o: any): o is MsgPauseByPoolIdsSDKType;
    encode(message: MsgPauseByPoolIds, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgPauseByPoolIds;
    fromJSON(object: any): MsgPauseByPoolIds;
    toJSON(message: MsgPauseByPoolIds): JsonSafe<MsgPauseByPoolIds>;
    fromPartial(object: Partial<MsgPauseByPoolIds>): MsgPauseByPoolIds;
    fromProtoMsg(message: MsgPauseByPoolIdsProtoMsg): MsgPauseByPoolIds;
    toProto(message: MsgPauseByPoolIds): Uint8Array;
    toProtoMsg(message: MsgPauseByPoolIds): MsgPauseByPoolIdsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgPauseByPoolIdsResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgPauseByPoolIdsResponse
 */
export declare const MsgPauseByPoolIdsResponse: {
    typeUrl: "/noble.swap.v1.MsgPauseByPoolIdsResponse";
    is(o: any): o is MsgPauseByPoolIdsResponse;
    isSDK(o: any): o is MsgPauseByPoolIdsResponseSDKType;
    encode(message: MsgPauseByPoolIdsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgPauseByPoolIdsResponse;
    fromJSON(object: any): MsgPauseByPoolIdsResponse;
    toJSON(message: MsgPauseByPoolIdsResponse): JsonSafe<MsgPauseByPoolIdsResponse>;
    fromPartial(object: Partial<MsgPauseByPoolIdsResponse>): MsgPauseByPoolIdsResponse;
    fromProtoMsg(message: MsgPauseByPoolIdsResponseProtoMsg): MsgPauseByPoolIdsResponse;
    toProto(message: MsgPauseByPoolIdsResponse): Uint8Array;
    toProtoMsg(message: MsgPauseByPoolIdsResponse): MsgPauseByPoolIdsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUnpauseByAlgorithm
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByAlgorithm
 */
export declare const MsgUnpauseByAlgorithm: {
    typeUrl: "/noble.swap.v1.MsgUnpauseByAlgorithm";
    aminoType: "swap/UnpauseByAlgorithm";
    is(o: any): o is MsgUnpauseByAlgorithm;
    isSDK(o: any): o is MsgUnpauseByAlgorithmSDKType;
    encode(message: MsgUnpauseByAlgorithm, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUnpauseByAlgorithm;
    fromJSON(object: any): MsgUnpauseByAlgorithm;
    toJSON(message: MsgUnpauseByAlgorithm): JsonSafe<MsgUnpauseByAlgorithm>;
    fromPartial(object: Partial<MsgUnpauseByAlgorithm>): MsgUnpauseByAlgorithm;
    fromProtoMsg(message: MsgUnpauseByAlgorithmProtoMsg): MsgUnpauseByAlgorithm;
    toProto(message: MsgUnpauseByAlgorithm): Uint8Array;
    toProtoMsg(message: MsgUnpauseByAlgorithm): MsgUnpauseByAlgorithmProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUnpauseByAlgorithmResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByAlgorithmResponse
 */
export declare const MsgUnpauseByAlgorithmResponse: {
    typeUrl: "/noble.swap.v1.MsgUnpauseByAlgorithmResponse";
    is(o: any): o is MsgUnpauseByAlgorithmResponse;
    isSDK(o: any): o is MsgUnpauseByAlgorithmResponseSDKType;
    encode(message: MsgUnpauseByAlgorithmResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUnpauseByAlgorithmResponse;
    fromJSON(object: any): MsgUnpauseByAlgorithmResponse;
    toJSON(message: MsgUnpauseByAlgorithmResponse): JsonSafe<MsgUnpauseByAlgorithmResponse>;
    fromPartial(object: Partial<MsgUnpauseByAlgorithmResponse>): MsgUnpauseByAlgorithmResponse;
    fromProtoMsg(message: MsgUnpauseByAlgorithmResponseProtoMsg): MsgUnpauseByAlgorithmResponse;
    toProto(message: MsgUnpauseByAlgorithmResponse): Uint8Array;
    toProtoMsg(message: MsgUnpauseByAlgorithmResponse): MsgUnpauseByAlgorithmResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUnpauseByPoolIds
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByPoolIds
 */
export declare const MsgUnpauseByPoolIds: {
    typeUrl: "/noble.swap.v1.MsgUnpauseByPoolIds";
    aminoType: "swap/UnpauseByPoolIds";
    is(o: any): o is MsgUnpauseByPoolIds;
    isSDK(o: any): o is MsgUnpauseByPoolIdsSDKType;
    encode(message: MsgUnpauseByPoolIds, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUnpauseByPoolIds;
    fromJSON(object: any): MsgUnpauseByPoolIds;
    toJSON(message: MsgUnpauseByPoolIds): JsonSafe<MsgUnpauseByPoolIds>;
    fromPartial(object: Partial<MsgUnpauseByPoolIds>): MsgUnpauseByPoolIds;
    fromProtoMsg(message: MsgUnpauseByPoolIdsProtoMsg): MsgUnpauseByPoolIds;
    toProto(message: MsgUnpauseByPoolIds): Uint8Array;
    toProtoMsg(message: MsgUnpauseByPoolIds): MsgUnpauseByPoolIdsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUnpauseByPoolIdsResponse
 * @package noble.swap.v1
 * @see proto type: noble.swap.v1.MsgUnpauseByPoolIdsResponse
 */
export declare const MsgUnpauseByPoolIdsResponse: {
    typeUrl: "/noble.swap.v1.MsgUnpauseByPoolIdsResponse";
    is(o: any): o is MsgUnpauseByPoolIdsResponse;
    isSDK(o: any): o is MsgUnpauseByPoolIdsResponseSDKType;
    encode(message: MsgUnpauseByPoolIdsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUnpauseByPoolIdsResponse;
    fromJSON(object: any): MsgUnpauseByPoolIdsResponse;
    toJSON(message: MsgUnpauseByPoolIdsResponse): JsonSafe<MsgUnpauseByPoolIdsResponse>;
    fromPartial(object: Partial<MsgUnpauseByPoolIdsResponse>): MsgUnpauseByPoolIdsResponse;
    fromProtoMsg(message: MsgUnpauseByPoolIdsResponseProtoMsg): MsgUnpauseByPoolIdsResponse;
    toProto(message: MsgUnpauseByPoolIdsResponse): Uint8Array;
    toProtoMsg(message: MsgUnpauseByPoolIdsResponse): MsgUnpauseByPoolIdsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map