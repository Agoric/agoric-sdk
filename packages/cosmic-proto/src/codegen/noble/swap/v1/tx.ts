//@ts-nocheck
import { Coin, type CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { Route, type RouteSDKType, Swap, type SwapSDKType } from './swap.js';
import { Algorithm, algorithmFromJSON, algorithmToJSON } from './algorithm.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
export interface MsgWithdrawProtocolFees {
  /** Address of the signer who is requesting the fee withdrawal. */
  signer: string;
  /** Address to which the withdrawn fees will be sent. */
  to: string;
}
export interface MsgWithdrawProtocolFeesProtoMsg {
  typeUrl: '/noble.swap.v1.MsgWithdrawProtocolFees';
  value: Uint8Array;
}
export interface MsgWithdrawProtocolFeesSDKType {
  signer: string;
  to: string;
}
export interface MsgWithdrawProtocolFeesResponse {}
export interface MsgWithdrawProtocolFeesResponseProtoMsg {
  typeUrl: '/noble.swap.v1.MsgWithdrawProtocolFeesResponse';
  value: Uint8Array;
}
export interface MsgWithdrawProtocolFeesResponseSDKType {}
export interface MsgWithdrawRewards {
  /** Address of the signer who is requesting the reward withdrawal. */
  signer: string;
}
export interface MsgWithdrawRewardsProtoMsg {
  typeUrl: '/noble.swap.v1.MsgWithdrawRewards';
  value: Uint8Array;
}
export interface MsgWithdrawRewardsSDKType {
  signer: string;
}
export interface MsgWithdrawRewardsResponse {
  /** List of rewards withdrawn by the user. */
  rewards: Coin[];
}
export interface MsgWithdrawRewardsResponseProtoMsg {
  typeUrl: '/noble.swap.v1.MsgWithdrawRewardsResponse';
  value: Uint8Array;
}
export interface MsgWithdrawRewardsResponseSDKType {
  rewards: CoinSDKType[];
}
export interface MsgSwap {
  /** Address of the signer who is initiating the swap. */
  signer: string;
  /** The coin to be swapped. */
  amount: Coin;
  /** The routes through which the swap will occur. */
  routes: Route[];
  /** The minimum amount of tokens expected after the swap. */
  min: Coin;
}
export interface MsgSwapProtoMsg {
  typeUrl: '/noble.swap.v1.MsgSwap';
  value: Uint8Array;
}
export interface MsgSwapSDKType {
  signer: string;
  amount: CoinSDKType;
  routes: RouteSDKType[];
  min: CoinSDKType;
}
export interface MsgSwapResponse {
  /** The resulting amount of tokens after the swap. */
  result: Coin;
  /** Details of each individual swap involved in the process. */
  swaps: Swap[];
}
export interface MsgSwapResponseProtoMsg {
  typeUrl: '/noble.swap.v1.MsgSwapResponse';
  value: Uint8Array;
}
export interface MsgSwapResponseSDKType {
  result: CoinSDKType;
  swaps: SwapSDKType[];
}
export interface MsgPauseByAlgorithm {
  /** Address of the signer who is requesting to pause the pools. */
  signer: string;
  /** The algorithm used by the pools to be paused. */
  algorithm: Algorithm;
}
export interface MsgPauseByAlgorithmProtoMsg {
  typeUrl: '/noble.swap.v1.MsgPauseByAlgorithm';
  value: Uint8Array;
}
export interface MsgPauseByAlgorithmSDKType {
  signer: string;
  algorithm: Algorithm;
}
export interface MsgPauseByAlgorithmResponse {
  /** List of IDs of the paused pools. */
  pausedPools: bigint[];
}
export interface MsgPauseByAlgorithmResponseProtoMsg {
  typeUrl: '/noble.swap.v1.MsgPauseByAlgorithmResponse';
  value: Uint8Array;
}
export interface MsgPauseByAlgorithmResponseSDKType {
  paused_pools: bigint[];
}
export interface MsgPauseByPoolIds {
  /** Address of the signer who is requesting to pause the pools. */
  signer: string;
  /** List of IDs of the pools to be paused. */
  poolIds: bigint[];
}
export interface MsgPauseByPoolIdsProtoMsg {
  typeUrl: '/noble.swap.v1.MsgPauseByPoolIds';
  value: Uint8Array;
}
export interface MsgPauseByPoolIdsSDKType {
  signer: string;
  pool_ids: bigint[];
}
export interface MsgPauseByPoolIdsResponse {
  /** List of IDs of the paused pools. */
  pausedPools: bigint[];
}
export interface MsgPauseByPoolIdsResponseProtoMsg {
  typeUrl: '/noble.swap.v1.MsgPauseByPoolIdsResponse';
  value: Uint8Array;
}
export interface MsgPauseByPoolIdsResponseSDKType {
  paused_pools: bigint[];
}
export interface MsgUnpauseByAlgorithm {
  /** Address of the signer who is requesting to unpause the pools. */
  signer: string;
  /** The algorithm used by the pools to be unpaused. */
  algorithm: Algorithm;
}
export interface MsgUnpauseByAlgorithmProtoMsg {
  typeUrl: '/noble.swap.v1.MsgUnpauseByAlgorithm';
  value: Uint8Array;
}
export interface MsgUnpauseByAlgorithmSDKType {
  signer: string;
  algorithm: Algorithm;
}
export interface MsgUnpauseByAlgorithmResponse {
  /** List of IDs of the unpaused pools. */
  unpausedPools: bigint[];
}
export interface MsgUnpauseByAlgorithmResponseProtoMsg {
  typeUrl: '/noble.swap.v1.MsgUnpauseByAlgorithmResponse';
  value: Uint8Array;
}
export interface MsgUnpauseByAlgorithmResponseSDKType {
  unpaused_pools: bigint[];
}
export interface MsgUnpauseByPoolIds {
  /** Address of the signer who is requesting to unpause the pools. */
  signer: string;
  /** List of IDs of the pools to be unpaused. */
  poolIds: bigint[];
}
export interface MsgUnpauseByPoolIdsProtoMsg {
  typeUrl: '/noble.swap.v1.MsgUnpauseByPoolIds';
  value: Uint8Array;
}
export interface MsgUnpauseByPoolIdsSDKType {
  signer: string;
  pool_ids: bigint[];
}
export interface MsgUnpauseByPoolIdsResponse {
  /** List of IDs of the unpaused pools. */
  unpausedPools: bigint[];
}
export interface MsgUnpauseByPoolIdsResponseProtoMsg {
  typeUrl: '/noble.swap.v1.MsgUnpauseByPoolIdsResponse';
  value: Uint8Array;
}
export interface MsgUnpauseByPoolIdsResponseSDKType {
  unpaused_pools: bigint[];
}
function createBaseMsgWithdrawProtocolFees(): MsgWithdrawProtocolFees {
  return {
    signer: '',
    to: '',
  };
}
export const MsgWithdrawProtocolFees = {
  typeUrl: '/noble.swap.v1.MsgWithdrawProtocolFees' as const,
  encode(
    message: MsgWithdrawProtocolFees,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.to !== '') {
      writer.uint32(18).string(message.to);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawProtocolFees {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawProtocolFees();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.to = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWithdrawProtocolFees {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      to: isSet(object.to) ? String(object.to) : '',
    };
  },
  toJSON(message: MsgWithdrawProtocolFees): JsonSafe<MsgWithdrawProtocolFees> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.to !== undefined && (obj.to = message.to);
    return obj;
  },
  fromPartial(
    object: Partial<MsgWithdrawProtocolFees>,
  ): MsgWithdrawProtocolFees {
    const message = createBaseMsgWithdrawProtocolFees();
    message.signer = object.signer ?? '';
    message.to = object.to ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgWithdrawProtocolFeesProtoMsg,
  ): MsgWithdrawProtocolFees {
    return MsgWithdrawProtocolFees.decode(message.value);
  },
  toProto(message: MsgWithdrawProtocolFees): Uint8Array {
    return MsgWithdrawProtocolFees.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWithdrawProtocolFees,
  ): MsgWithdrawProtocolFeesProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgWithdrawProtocolFees',
      value: MsgWithdrawProtocolFees.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawProtocolFeesResponse(): MsgWithdrawProtocolFeesResponse {
  return {};
}
export const MsgWithdrawProtocolFeesResponse = {
  typeUrl: '/noble.swap.v1.MsgWithdrawProtocolFeesResponse' as const,
  encode(
    _: MsgWithdrawProtocolFeesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawProtocolFeesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawProtocolFeesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgWithdrawProtocolFeesResponse {
    return {};
  },
  toJSON(
    _: MsgWithdrawProtocolFeesResponse,
  ): JsonSafe<MsgWithdrawProtocolFeesResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgWithdrawProtocolFeesResponse>,
  ): MsgWithdrawProtocolFeesResponse {
    const message = createBaseMsgWithdrawProtocolFeesResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgWithdrawProtocolFeesResponseProtoMsg,
  ): MsgWithdrawProtocolFeesResponse {
    return MsgWithdrawProtocolFeesResponse.decode(message.value);
  },
  toProto(message: MsgWithdrawProtocolFeesResponse): Uint8Array {
    return MsgWithdrawProtocolFeesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWithdrawProtocolFeesResponse,
  ): MsgWithdrawProtocolFeesResponseProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgWithdrawProtocolFeesResponse',
      value: MsgWithdrawProtocolFeesResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawRewards(): MsgWithdrawRewards {
  return {
    signer: '',
  };
}
export const MsgWithdrawRewards = {
  typeUrl: '/noble.swap.v1.MsgWithdrawRewards' as const,
  encode(
    message: MsgWithdrawRewards,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawRewards {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawRewards();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWithdrawRewards {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgWithdrawRewards): JsonSafe<MsgWithdrawRewards> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgWithdrawRewards>): MsgWithdrawRewards {
    const message = createBaseMsgWithdrawRewards();
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgWithdrawRewardsProtoMsg): MsgWithdrawRewards {
    return MsgWithdrawRewards.decode(message.value);
  },
  toProto(message: MsgWithdrawRewards): Uint8Array {
    return MsgWithdrawRewards.encode(message).finish();
  },
  toProtoMsg(message: MsgWithdrawRewards): MsgWithdrawRewardsProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgWithdrawRewards',
      value: MsgWithdrawRewards.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawRewardsResponse(): MsgWithdrawRewardsResponse {
  return {
    rewards: [],
  };
}
export const MsgWithdrawRewardsResponse = {
  typeUrl: '/noble.swap.v1.MsgWithdrawRewardsResponse' as const,
  encode(
    message: MsgWithdrawRewardsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.rewards) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawRewardsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawRewardsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.rewards.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWithdrawRewardsResponse {
    return {
      rewards: Array.isArray(object?.rewards)
        ? object.rewards.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: MsgWithdrawRewardsResponse,
  ): JsonSafe<MsgWithdrawRewardsResponse> {
    const obj: any = {};
    if (message.rewards) {
      obj.rewards = message.rewards.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.rewards = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgWithdrawRewardsResponse>,
  ): MsgWithdrawRewardsResponse {
    const message = createBaseMsgWithdrawRewardsResponse();
    message.rewards = object.rewards?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgWithdrawRewardsResponseProtoMsg,
  ): MsgWithdrawRewardsResponse {
    return MsgWithdrawRewardsResponse.decode(message.value);
  },
  toProto(message: MsgWithdrawRewardsResponse): Uint8Array {
    return MsgWithdrawRewardsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWithdrawRewardsResponse,
  ): MsgWithdrawRewardsResponseProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgWithdrawRewardsResponse',
      value: MsgWithdrawRewardsResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSwap(): MsgSwap {
  return {
    signer: '',
    amount: Coin.fromPartial({}),
    routes: [],
    min: Coin.fromPartial({}),
  };
}
export const MsgSwap = {
  typeUrl: '/noble.swap.v1.MsgSwap' as const,
  encode(
    message: MsgSwap,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.amount !== undefined) {
      Coin.encode(message.amount, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.routes) {
      Route.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.min !== undefined) {
      Coin.encode(message.min, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSwap {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSwap();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.amount = Coin.decode(reader, reader.uint32());
          break;
        case 3:
          message.routes.push(Route.decode(reader, reader.uint32()));
          break;
        case 4:
          message.min = Coin.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSwap {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      amount: isSet(object.amount) ? Coin.fromJSON(object.amount) : undefined,
      routes: Array.isArray(object?.routes)
        ? object.routes.map((e: any) => Route.fromJSON(e))
        : [],
      min: isSet(object.min) ? Coin.fromJSON(object.min) : undefined,
    };
  },
  toJSON(message: MsgSwap): JsonSafe<MsgSwap> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.amount !== undefined &&
      (obj.amount = message.amount ? Coin.toJSON(message.amount) : undefined);
    if (message.routes) {
      obj.routes = message.routes.map(e => (e ? Route.toJSON(e) : undefined));
    } else {
      obj.routes = [];
    }
    message.min !== undefined &&
      (obj.min = message.min ? Coin.toJSON(message.min) : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgSwap>): MsgSwap {
    const message = createBaseMsgSwap();
    message.signer = object.signer ?? '';
    message.amount =
      object.amount !== undefined && object.amount !== null
        ? Coin.fromPartial(object.amount)
        : undefined;
    message.routes = object.routes?.map(e => Route.fromPartial(e)) || [];
    message.min =
      object.min !== undefined && object.min !== null
        ? Coin.fromPartial(object.min)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgSwapProtoMsg): MsgSwap {
    return MsgSwap.decode(message.value);
  },
  toProto(message: MsgSwap): Uint8Array {
    return MsgSwap.encode(message).finish();
  },
  toProtoMsg(message: MsgSwap): MsgSwapProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgSwap',
      value: MsgSwap.encode(message).finish(),
    };
  },
};
function createBaseMsgSwapResponse(): MsgSwapResponse {
  return {
    result: Coin.fromPartial({}),
    swaps: [],
  };
}
export const MsgSwapResponse = {
  typeUrl: '/noble.swap.v1.MsgSwapResponse' as const,
  encode(
    message: MsgSwapResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== undefined) {
      Coin.encode(message.result, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.swaps) {
      Swap.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSwapResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSwapResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = Coin.decode(reader, reader.uint32());
          break;
        case 2:
          message.swaps.push(Swap.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSwapResponse {
    return {
      result: isSet(object.result) ? Coin.fromJSON(object.result) : undefined,
      swaps: Array.isArray(object?.swaps)
        ? object.swaps.map((e: any) => Swap.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgSwapResponse): JsonSafe<MsgSwapResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = message.result ? Coin.toJSON(message.result) : undefined);
    if (message.swaps) {
      obj.swaps = message.swaps.map(e => (e ? Swap.toJSON(e) : undefined));
    } else {
      obj.swaps = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgSwapResponse>): MsgSwapResponse {
    const message = createBaseMsgSwapResponse();
    message.result =
      object.result !== undefined && object.result !== null
        ? Coin.fromPartial(object.result)
        : undefined;
    message.swaps = object.swaps?.map(e => Swap.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgSwapResponseProtoMsg): MsgSwapResponse {
    return MsgSwapResponse.decode(message.value);
  },
  toProto(message: MsgSwapResponse): Uint8Array {
    return MsgSwapResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgSwapResponse): MsgSwapResponseProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgSwapResponse',
      value: MsgSwapResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgPauseByAlgorithm(): MsgPauseByAlgorithm {
  return {
    signer: '',
    algorithm: 0,
  };
}
export const MsgPauseByAlgorithm = {
  typeUrl: '/noble.swap.v1.MsgPauseByAlgorithm' as const,
  encode(
    message: MsgPauseByAlgorithm,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.algorithm !== 0) {
      writer.uint32(16).int32(message.algorithm);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPauseByAlgorithm {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPauseByAlgorithm();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.algorithm = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgPauseByAlgorithm {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      algorithm: isSet(object.algorithm)
        ? algorithmFromJSON(object.algorithm)
        : -1,
    };
  },
  toJSON(message: MsgPauseByAlgorithm): JsonSafe<MsgPauseByAlgorithm> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.algorithm !== undefined &&
      (obj.algorithm = algorithmToJSON(message.algorithm));
    return obj;
  },
  fromPartial(object: Partial<MsgPauseByAlgorithm>): MsgPauseByAlgorithm {
    const message = createBaseMsgPauseByAlgorithm();
    message.signer = object.signer ?? '';
    message.algorithm = object.algorithm ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgPauseByAlgorithmProtoMsg): MsgPauseByAlgorithm {
    return MsgPauseByAlgorithm.decode(message.value);
  },
  toProto(message: MsgPauseByAlgorithm): Uint8Array {
    return MsgPauseByAlgorithm.encode(message).finish();
  },
  toProtoMsg(message: MsgPauseByAlgorithm): MsgPauseByAlgorithmProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgPauseByAlgorithm',
      value: MsgPauseByAlgorithm.encode(message).finish(),
    };
  },
};
function createBaseMsgPauseByAlgorithmResponse(): MsgPauseByAlgorithmResponse {
  return {
    pausedPools: [],
  };
}
export const MsgPauseByAlgorithmResponse = {
  typeUrl: '/noble.swap.v1.MsgPauseByAlgorithmResponse' as const,
  encode(
    message: MsgPauseByAlgorithmResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.pausedPools) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPauseByAlgorithmResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPauseByAlgorithmResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.pausedPools.push(reader.uint64());
            }
          } else {
            message.pausedPools.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgPauseByAlgorithmResponse {
    return {
      pausedPools: Array.isArray(object?.pausedPools)
        ? object.pausedPools.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: MsgPauseByAlgorithmResponse,
  ): JsonSafe<MsgPauseByAlgorithmResponse> {
    const obj: any = {};
    if (message.pausedPools) {
      obj.pausedPools = message.pausedPools.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.pausedPools = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgPauseByAlgorithmResponse>,
  ): MsgPauseByAlgorithmResponse {
    const message = createBaseMsgPauseByAlgorithmResponse();
    message.pausedPools =
      object.pausedPools?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgPauseByAlgorithmResponseProtoMsg,
  ): MsgPauseByAlgorithmResponse {
    return MsgPauseByAlgorithmResponse.decode(message.value);
  },
  toProto(message: MsgPauseByAlgorithmResponse): Uint8Array {
    return MsgPauseByAlgorithmResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPauseByAlgorithmResponse,
  ): MsgPauseByAlgorithmResponseProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgPauseByAlgorithmResponse',
      value: MsgPauseByAlgorithmResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgPauseByPoolIds(): MsgPauseByPoolIds {
  return {
    signer: '',
    poolIds: [],
  };
}
export const MsgPauseByPoolIds = {
  typeUrl: '/noble.swap.v1.MsgPauseByPoolIds' as const,
  encode(
    message: MsgPauseByPoolIds,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    writer.uint32(18).fork();
    for (const v of message.poolIds) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgPauseByPoolIds {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPauseByPoolIds();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.poolIds.push(reader.uint64());
            }
          } else {
            message.poolIds.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgPauseByPoolIds {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      poolIds: Array.isArray(object?.poolIds)
        ? object.poolIds.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(message: MsgPauseByPoolIds): JsonSafe<MsgPauseByPoolIds> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    if (message.poolIds) {
      obj.poolIds = message.poolIds.map(e => (e || BigInt(0)).toString());
    } else {
      obj.poolIds = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgPauseByPoolIds>): MsgPauseByPoolIds {
    const message = createBaseMsgPauseByPoolIds();
    message.signer = object.signer ?? '';
    message.poolIds = object.poolIds?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(message: MsgPauseByPoolIdsProtoMsg): MsgPauseByPoolIds {
    return MsgPauseByPoolIds.decode(message.value);
  },
  toProto(message: MsgPauseByPoolIds): Uint8Array {
    return MsgPauseByPoolIds.encode(message).finish();
  },
  toProtoMsg(message: MsgPauseByPoolIds): MsgPauseByPoolIdsProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgPauseByPoolIds',
      value: MsgPauseByPoolIds.encode(message).finish(),
    };
  },
};
function createBaseMsgPauseByPoolIdsResponse(): MsgPauseByPoolIdsResponse {
  return {
    pausedPools: [],
  };
}
export const MsgPauseByPoolIdsResponse = {
  typeUrl: '/noble.swap.v1.MsgPauseByPoolIdsResponse' as const,
  encode(
    message: MsgPauseByPoolIdsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.pausedPools) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPauseByPoolIdsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPauseByPoolIdsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.pausedPools.push(reader.uint64());
            }
          } else {
            message.pausedPools.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgPauseByPoolIdsResponse {
    return {
      pausedPools: Array.isArray(object?.pausedPools)
        ? object.pausedPools.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: MsgPauseByPoolIdsResponse,
  ): JsonSafe<MsgPauseByPoolIdsResponse> {
    const obj: any = {};
    if (message.pausedPools) {
      obj.pausedPools = message.pausedPools.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.pausedPools = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgPauseByPoolIdsResponse>,
  ): MsgPauseByPoolIdsResponse {
    const message = createBaseMsgPauseByPoolIdsResponse();
    message.pausedPools =
      object.pausedPools?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgPauseByPoolIdsResponseProtoMsg,
  ): MsgPauseByPoolIdsResponse {
    return MsgPauseByPoolIdsResponse.decode(message.value);
  },
  toProto(message: MsgPauseByPoolIdsResponse): Uint8Array {
    return MsgPauseByPoolIdsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPauseByPoolIdsResponse,
  ): MsgPauseByPoolIdsResponseProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgPauseByPoolIdsResponse',
      value: MsgPauseByPoolIdsResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUnpauseByAlgorithm(): MsgUnpauseByAlgorithm {
  return {
    signer: '',
    algorithm: 0,
  };
}
export const MsgUnpauseByAlgorithm = {
  typeUrl: '/noble.swap.v1.MsgUnpauseByAlgorithm' as const,
  encode(
    message: MsgUnpauseByAlgorithm,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.algorithm !== 0) {
      writer.uint32(16).int32(message.algorithm);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnpauseByAlgorithm {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpauseByAlgorithm();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.algorithm = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnpauseByAlgorithm {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      algorithm: isSet(object.algorithm)
        ? algorithmFromJSON(object.algorithm)
        : -1,
    };
  },
  toJSON(message: MsgUnpauseByAlgorithm): JsonSafe<MsgUnpauseByAlgorithm> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.algorithm !== undefined &&
      (obj.algorithm = algorithmToJSON(message.algorithm));
    return obj;
  },
  fromPartial(object: Partial<MsgUnpauseByAlgorithm>): MsgUnpauseByAlgorithm {
    const message = createBaseMsgUnpauseByAlgorithm();
    message.signer = object.signer ?? '';
    message.algorithm = object.algorithm ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgUnpauseByAlgorithmProtoMsg): MsgUnpauseByAlgorithm {
    return MsgUnpauseByAlgorithm.decode(message.value);
  },
  toProto(message: MsgUnpauseByAlgorithm): Uint8Array {
    return MsgUnpauseByAlgorithm.encode(message).finish();
  },
  toProtoMsg(message: MsgUnpauseByAlgorithm): MsgUnpauseByAlgorithmProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgUnpauseByAlgorithm',
      value: MsgUnpauseByAlgorithm.encode(message).finish(),
    };
  },
};
function createBaseMsgUnpauseByAlgorithmResponse(): MsgUnpauseByAlgorithmResponse {
  return {
    unpausedPools: [],
  };
}
export const MsgUnpauseByAlgorithmResponse = {
  typeUrl: '/noble.swap.v1.MsgUnpauseByAlgorithmResponse' as const,
  encode(
    message: MsgUnpauseByAlgorithmResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.unpausedPools) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnpauseByAlgorithmResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpauseByAlgorithmResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.unpausedPools.push(reader.uint64());
            }
          } else {
            message.unpausedPools.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnpauseByAlgorithmResponse {
    return {
      unpausedPools: Array.isArray(object?.unpausedPools)
        ? object.unpausedPools.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: MsgUnpauseByAlgorithmResponse,
  ): JsonSafe<MsgUnpauseByAlgorithmResponse> {
    const obj: any = {};
    if (message.unpausedPools) {
      obj.unpausedPools = message.unpausedPools.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.unpausedPools = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgUnpauseByAlgorithmResponse>,
  ): MsgUnpauseByAlgorithmResponse {
    const message = createBaseMsgUnpauseByAlgorithmResponse();
    message.unpausedPools =
      object.unpausedPools?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgUnpauseByAlgorithmResponseProtoMsg,
  ): MsgUnpauseByAlgorithmResponse {
    return MsgUnpauseByAlgorithmResponse.decode(message.value);
  },
  toProto(message: MsgUnpauseByAlgorithmResponse): Uint8Array {
    return MsgUnpauseByAlgorithmResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUnpauseByAlgorithmResponse,
  ): MsgUnpauseByAlgorithmResponseProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgUnpauseByAlgorithmResponse',
      value: MsgUnpauseByAlgorithmResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUnpauseByPoolIds(): MsgUnpauseByPoolIds {
  return {
    signer: '',
    poolIds: [],
  };
}
export const MsgUnpauseByPoolIds = {
  typeUrl: '/noble.swap.v1.MsgUnpauseByPoolIds' as const,
  encode(
    message: MsgUnpauseByPoolIds,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    writer.uint32(18).fork();
    for (const v of message.poolIds) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnpauseByPoolIds {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpauseByPoolIds();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.poolIds.push(reader.uint64());
            }
          } else {
            message.poolIds.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnpauseByPoolIds {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      poolIds: Array.isArray(object?.poolIds)
        ? object.poolIds.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(message: MsgUnpauseByPoolIds): JsonSafe<MsgUnpauseByPoolIds> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    if (message.poolIds) {
      obj.poolIds = message.poolIds.map(e => (e || BigInt(0)).toString());
    } else {
      obj.poolIds = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgUnpauseByPoolIds>): MsgUnpauseByPoolIds {
    const message = createBaseMsgUnpauseByPoolIds();
    message.signer = object.signer ?? '';
    message.poolIds = object.poolIds?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(message: MsgUnpauseByPoolIdsProtoMsg): MsgUnpauseByPoolIds {
    return MsgUnpauseByPoolIds.decode(message.value);
  },
  toProto(message: MsgUnpauseByPoolIds): Uint8Array {
    return MsgUnpauseByPoolIds.encode(message).finish();
  },
  toProtoMsg(message: MsgUnpauseByPoolIds): MsgUnpauseByPoolIdsProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgUnpauseByPoolIds',
      value: MsgUnpauseByPoolIds.encode(message).finish(),
    };
  },
};
function createBaseMsgUnpauseByPoolIdsResponse(): MsgUnpauseByPoolIdsResponse {
  return {
    unpausedPools: [],
  };
}
export const MsgUnpauseByPoolIdsResponse = {
  typeUrl: '/noble.swap.v1.MsgUnpauseByPoolIdsResponse' as const,
  encode(
    message: MsgUnpauseByPoolIdsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.unpausedPools) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnpauseByPoolIdsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpauseByPoolIdsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.unpausedPools.push(reader.uint64());
            }
          } else {
            message.unpausedPools.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnpauseByPoolIdsResponse {
    return {
      unpausedPools: Array.isArray(object?.unpausedPools)
        ? object.unpausedPools.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: MsgUnpauseByPoolIdsResponse,
  ): JsonSafe<MsgUnpauseByPoolIdsResponse> {
    const obj: any = {};
    if (message.unpausedPools) {
      obj.unpausedPools = message.unpausedPools.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.unpausedPools = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgUnpauseByPoolIdsResponse>,
  ): MsgUnpauseByPoolIdsResponse {
    const message = createBaseMsgUnpauseByPoolIdsResponse();
    message.unpausedPools =
      object.unpausedPools?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgUnpauseByPoolIdsResponseProtoMsg,
  ): MsgUnpauseByPoolIdsResponse {
    return MsgUnpauseByPoolIdsResponse.decode(message.value);
  },
  toProto(message: MsgUnpauseByPoolIdsResponse): Uint8Array {
    return MsgUnpauseByPoolIdsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUnpauseByPoolIdsResponse,
  ): MsgUnpauseByPoolIdsResponseProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.MsgUnpauseByPoolIdsResponse',
      value: MsgUnpauseByPoolIdsResponse.encode(message).finish(),
    };
  },
};
