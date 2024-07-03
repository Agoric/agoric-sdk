//@ts-nocheck
import { Coin, CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/**
 * ===================== MsgJoinPool
 * This is really MsgJoinPoolNoSwap
 */
export interface MsgJoinPool {
  sender: string;
  poolId: bigint;
  shareOutAmount: string;
  tokenInMaxs: Coin[];
}
export interface MsgJoinPoolProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinPool';
  value: Uint8Array;
}
/**
 * ===================== MsgJoinPool
 * This is really MsgJoinPoolNoSwap
 */
export interface MsgJoinPoolSDKType {
  sender: string;
  pool_id: bigint;
  share_out_amount: string;
  token_in_maxs: CoinSDKType[];
}
export interface MsgJoinPoolResponse {
  shareOutAmount: string;
  tokenIn: Coin[];
}
export interface MsgJoinPoolResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinPoolResponse';
  value: Uint8Array;
}
export interface MsgJoinPoolResponseSDKType {
  share_out_amount: string;
  token_in: CoinSDKType[];
}
/** ===================== MsgExitPool */
export interface MsgExitPool {
  sender: string;
  poolId: bigint;
  shareInAmount: string;
  tokenOutMins: Coin[];
}
export interface MsgExitPoolProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitPool';
  value: Uint8Array;
}
/** ===================== MsgExitPool */
export interface MsgExitPoolSDKType {
  sender: string;
  pool_id: bigint;
  share_in_amount: string;
  token_out_mins: CoinSDKType[];
}
export interface MsgExitPoolResponse {
  tokenOut: Coin[];
}
export interface MsgExitPoolResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitPoolResponse';
  value: Uint8Array;
}
export interface MsgExitPoolResponseSDKType {
  token_out: CoinSDKType[];
}
/** ===================== MsgSwapExactAmountIn */
export interface SwapAmountInRoute {
  poolId: bigint;
  tokenOutDenom: string;
}
export interface SwapAmountInRouteProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.SwapAmountInRoute';
  value: Uint8Array;
}
/** ===================== MsgSwapExactAmountIn */
export interface SwapAmountInRouteSDKType {
  pool_id: bigint;
  token_out_denom: string;
}
export interface MsgSwapExactAmountIn {
  sender: string;
  routes: SwapAmountInRoute[];
  tokenIn: Coin;
  tokenOutMinAmount: string;
}
export interface MsgSwapExactAmountInProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountIn';
  value: Uint8Array;
}
export interface MsgSwapExactAmountInSDKType {
  sender: string;
  routes: SwapAmountInRouteSDKType[];
  token_in: CoinSDKType;
  token_out_min_amount: string;
}
export interface MsgSwapExactAmountInResponse {
  tokenOutAmount: string;
}
export interface MsgSwapExactAmountInResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountInResponse';
  value: Uint8Array;
}
export interface MsgSwapExactAmountInResponseSDKType {
  token_out_amount: string;
}
/** ===================== MsgSwapExactAmountOut */
export interface SwapAmountOutRoute {
  poolId: bigint;
  tokenInDenom: string;
}
export interface SwapAmountOutRouteProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.SwapAmountOutRoute';
  value: Uint8Array;
}
/** ===================== MsgSwapExactAmountOut */
export interface SwapAmountOutRouteSDKType {
  pool_id: bigint;
  token_in_denom: string;
}
export interface MsgSwapExactAmountOut {
  sender: string;
  routes: SwapAmountOutRoute[];
  tokenInMaxAmount: string;
  tokenOut: Coin;
}
export interface MsgSwapExactAmountOutProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountOut';
  value: Uint8Array;
}
export interface MsgSwapExactAmountOutSDKType {
  sender: string;
  routes: SwapAmountOutRouteSDKType[];
  token_in_max_amount: string;
  token_out: CoinSDKType;
}
export interface MsgSwapExactAmountOutResponse {
  tokenInAmount: string;
}
export interface MsgSwapExactAmountOutResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountOutResponse';
  value: Uint8Array;
}
export interface MsgSwapExactAmountOutResponseSDKType {
  token_in_amount: string;
}
/**
 * ===================== MsgJoinSwapExternAmountIn
 * TODO: Rename to MsgJoinSwapExactAmountIn
 */
export interface MsgJoinSwapExternAmountIn {
  sender: string;
  poolId: bigint;
  tokenIn: Coin;
  shareOutMinAmount: string;
}
export interface MsgJoinSwapExternAmountInProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapExternAmountIn';
  value: Uint8Array;
}
/**
 * ===================== MsgJoinSwapExternAmountIn
 * TODO: Rename to MsgJoinSwapExactAmountIn
 */
export interface MsgJoinSwapExternAmountInSDKType {
  sender: string;
  pool_id: bigint;
  token_in: CoinSDKType;
  share_out_min_amount: string;
}
export interface MsgJoinSwapExternAmountInResponse {
  shareOutAmount: string;
}
export interface MsgJoinSwapExternAmountInResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapExternAmountInResponse';
  value: Uint8Array;
}
export interface MsgJoinSwapExternAmountInResponseSDKType {
  share_out_amount: string;
}
/** ===================== MsgJoinSwapShareAmountOut */
export interface MsgJoinSwapShareAmountOut {
  sender: string;
  poolId: bigint;
  tokenInDenom: string;
  shareOutAmount: string;
  tokenInMaxAmount: string;
}
export interface MsgJoinSwapShareAmountOutProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapShareAmountOut';
  value: Uint8Array;
}
/** ===================== MsgJoinSwapShareAmountOut */
export interface MsgJoinSwapShareAmountOutSDKType {
  sender: string;
  pool_id: bigint;
  token_in_denom: string;
  share_out_amount: string;
  token_in_max_amount: string;
}
export interface MsgJoinSwapShareAmountOutResponse {
  tokenInAmount: string;
}
export interface MsgJoinSwapShareAmountOutResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapShareAmountOutResponse';
  value: Uint8Array;
}
export interface MsgJoinSwapShareAmountOutResponseSDKType {
  token_in_amount: string;
}
/** ===================== MsgExitSwapShareAmountIn */
export interface MsgExitSwapShareAmountIn {
  sender: string;
  poolId: bigint;
  tokenOutDenom: string;
  shareInAmount: string;
  tokenOutMinAmount: string;
}
export interface MsgExitSwapShareAmountInProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapShareAmountIn';
  value: Uint8Array;
}
/** ===================== MsgExitSwapShareAmountIn */
export interface MsgExitSwapShareAmountInSDKType {
  sender: string;
  pool_id: bigint;
  token_out_denom: string;
  share_in_amount: string;
  token_out_min_amount: string;
}
export interface MsgExitSwapShareAmountInResponse {
  tokenOutAmount: string;
}
export interface MsgExitSwapShareAmountInResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapShareAmountInResponse';
  value: Uint8Array;
}
export interface MsgExitSwapShareAmountInResponseSDKType {
  token_out_amount: string;
}
/** ===================== MsgExitSwapExternAmountOut */
export interface MsgExitSwapExternAmountOut {
  sender: string;
  poolId: bigint;
  tokenOut: Coin;
  shareInMaxAmount: string;
}
export interface MsgExitSwapExternAmountOutProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapExternAmountOut';
  value: Uint8Array;
}
/** ===================== MsgExitSwapExternAmountOut */
export interface MsgExitSwapExternAmountOutSDKType {
  sender: string;
  pool_id: bigint;
  token_out: CoinSDKType;
  share_in_max_amount: string;
}
export interface MsgExitSwapExternAmountOutResponse {
  shareInAmount: string;
}
export interface MsgExitSwapExternAmountOutResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapExternAmountOutResponse';
  value: Uint8Array;
}
export interface MsgExitSwapExternAmountOutResponseSDKType {
  share_in_amount: string;
}
function createBaseMsgJoinPool(): MsgJoinPool {
  return {
    sender: '',
    poolId: BigInt(0),
    shareOutAmount: '',
    tokenInMaxs: [],
  };
}
export const MsgJoinPool = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinPool',
  encode(
    message: MsgJoinPool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    if (message.shareOutAmount !== '') {
      writer.uint32(26).string(message.shareOutAmount);
    }
    for (const v of message.tokenInMaxs) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgJoinPool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgJoinPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolId = reader.uint64();
          break;
        case 3:
          message.shareOutAmount = reader.string();
          break;
        case 4:
          message.tokenInMaxs.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgJoinPool {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      shareOutAmount: isSet(object.shareOutAmount)
        ? String(object.shareOutAmount)
        : '',
      tokenInMaxs: Array.isArray(object?.tokenInMaxs)
        ? object.tokenInMaxs.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgJoinPool): JsonSafe<MsgJoinPool> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.shareOutAmount !== undefined &&
      (obj.shareOutAmount = message.shareOutAmount);
    if (message.tokenInMaxs) {
      obj.tokenInMaxs = message.tokenInMaxs.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.tokenInMaxs = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgJoinPool>): MsgJoinPool {
    const message = createBaseMsgJoinPool();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.shareOutAmount = object.shareOutAmount ?? '';
    message.tokenInMaxs =
      object.tokenInMaxs?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgJoinPoolProtoMsg): MsgJoinPool {
    return MsgJoinPool.decode(message.value);
  },
  toProto(message: MsgJoinPool): Uint8Array {
    return MsgJoinPool.encode(message).finish();
  },
  toProtoMsg(message: MsgJoinPool): MsgJoinPoolProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgJoinPool',
      value: MsgJoinPool.encode(message).finish(),
    };
  },
};
function createBaseMsgJoinPoolResponse(): MsgJoinPoolResponse {
  return {
    shareOutAmount: '',
    tokenIn: [],
  };
}
export const MsgJoinPoolResponse = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinPoolResponse',
  encode(
    message: MsgJoinPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.shareOutAmount !== '') {
      writer.uint32(10).string(message.shareOutAmount);
    }
    for (const v of message.tokenIn) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgJoinPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgJoinPoolResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.shareOutAmount = reader.string();
          break;
        case 2:
          message.tokenIn.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgJoinPoolResponse {
    return {
      shareOutAmount: isSet(object.shareOutAmount)
        ? String(object.shareOutAmount)
        : '',
      tokenIn: Array.isArray(object?.tokenIn)
        ? object.tokenIn.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgJoinPoolResponse): JsonSafe<MsgJoinPoolResponse> {
    const obj: any = {};
    message.shareOutAmount !== undefined &&
      (obj.shareOutAmount = message.shareOutAmount);
    if (message.tokenIn) {
      obj.tokenIn = message.tokenIn.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.tokenIn = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgJoinPoolResponse>): MsgJoinPoolResponse {
    const message = createBaseMsgJoinPoolResponse();
    message.shareOutAmount = object.shareOutAmount ?? '';
    message.tokenIn = object.tokenIn?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgJoinPoolResponseProtoMsg): MsgJoinPoolResponse {
    return MsgJoinPoolResponse.decode(message.value);
  },
  toProto(message: MsgJoinPoolResponse): Uint8Array {
    return MsgJoinPoolResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgJoinPoolResponse): MsgJoinPoolResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgJoinPoolResponse',
      value: MsgJoinPoolResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgExitPool(): MsgExitPool {
  return {
    sender: '',
    poolId: BigInt(0),
    shareInAmount: '',
    tokenOutMins: [],
  };
}
export const MsgExitPool = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitPool',
  encode(
    message: MsgExitPool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    if (message.shareInAmount !== '') {
      writer.uint32(26).string(message.shareInAmount);
    }
    for (const v of message.tokenOutMins) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgExitPool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExitPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolId = reader.uint64();
          break;
        case 3:
          message.shareInAmount = reader.string();
          break;
        case 4:
          message.tokenOutMins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExitPool {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      shareInAmount: isSet(object.shareInAmount)
        ? String(object.shareInAmount)
        : '',
      tokenOutMins: Array.isArray(object?.tokenOutMins)
        ? object.tokenOutMins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgExitPool): JsonSafe<MsgExitPool> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.shareInAmount !== undefined &&
      (obj.shareInAmount = message.shareInAmount);
    if (message.tokenOutMins) {
      obj.tokenOutMins = message.tokenOutMins.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.tokenOutMins = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgExitPool>): MsgExitPool {
    const message = createBaseMsgExitPool();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.shareInAmount = object.shareInAmount ?? '';
    message.tokenOutMins =
      object.tokenOutMins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgExitPoolProtoMsg): MsgExitPool {
    return MsgExitPool.decode(message.value);
  },
  toProto(message: MsgExitPool): Uint8Array {
    return MsgExitPool.encode(message).finish();
  },
  toProtoMsg(message: MsgExitPool): MsgExitPoolProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgExitPool',
      value: MsgExitPool.encode(message).finish(),
    };
  },
};
function createBaseMsgExitPoolResponse(): MsgExitPoolResponse {
  return {
    tokenOut: [],
  };
}
export const MsgExitPoolResponse = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitPoolResponse',
  encode(
    message: MsgExitPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.tokenOut) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgExitPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExitPoolResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tokenOut.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExitPoolResponse {
    return {
      tokenOut: Array.isArray(object?.tokenOut)
        ? object.tokenOut.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgExitPoolResponse): JsonSafe<MsgExitPoolResponse> {
    const obj: any = {};
    if (message.tokenOut) {
      obj.tokenOut = message.tokenOut.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.tokenOut = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgExitPoolResponse>): MsgExitPoolResponse {
    const message = createBaseMsgExitPoolResponse();
    message.tokenOut = object.tokenOut?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgExitPoolResponseProtoMsg): MsgExitPoolResponse {
    return MsgExitPoolResponse.decode(message.value);
  },
  toProto(message: MsgExitPoolResponse): Uint8Array {
    return MsgExitPoolResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgExitPoolResponse): MsgExitPoolResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgExitPoolResponse',
      value: MsgExitPoolResponse.encode(message).finish(),
    };
  },
};
function createBaseSwapAmountInRoute(): SwapAmountInRoute {
  return {
    poolId: BigInt(0),
    tokenOutDenom: '',
  };
}
export const SwapAmountInRoute = {
  typeUrl: '/osmosis.gamm.v1beta1.SwapAmountInRoute',
  encode(
    message: SwapAmountInRoute,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.tokenOutDenom !== '') {
      writer.uint32(18).string(message.tokenOutDenom);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SwapAmountInRoute {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSwapAmountInRoute();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.tokenOutDenom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SwapAmountInRoute {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      tokenOutDenom: isSet(object.tokenOutDenom)
        ? String(object.tokenOutDenom)
        : '',
    };
  },
  toJSON(message: SwapAmountInRoute): JsonSafe<SwapAmountInRoute> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.tokenOutDenom !== undefined &&
      (obj.tokenOutDenom = message.tokenOutDenom);
    return obj;
  },
  fromPartial(object: Partial<SwapAmountInRoute>): SwapAmountInRoute {
    const message = createBaseSwapAmountInRoute();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.tokenOutDenom = object.tokenOutDenom ?? '';
    return message;
  },
  fromProtoMsg(message: SwapAmountInRouteProtoMsg): SwapAmountInRoute {
    return SwapAmountInRoute.decode(message.value);
  },
  toProto(message: SwapAmountInRoute): Uint8Array {
    return SwapAmountInRoute.encode(message).finish();
  },
  toProtoMsg(message: SwapAmountInRoute): SwapAmountInRouteProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.SwapAmountInRoute',
      value: SwapAmountInRoute.encode(message).finish(),
    };
  },
};
function createBaseMsgSwapExactAmountIn(): MsgSwapExactAmountIn {
  return {
    sender: '',
    routes: [],
    tokenIn: Coin.fromPartial({}),
    tokenOutMinAmount: '',
  };
}
export const MsgSwapExactAmountIn = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountIn',
  encode(
    message: MsgSwapExactAmountIn,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    for (const v of message.routes) {
      SwapAmountInRoute.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.tokenIn !== undefined) {
      Coin.encode(message.tokenIn, writer.uint32(26).fork()).ldelim();
    }
    if (message.tokenOutMinAmount !== '') {
      writer.uint32(34).string(message.tokenOutMinAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSwapExactAmountIn {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSwapExactAmountIn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.routes.push(
            SwapAmountInRoute.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.tokenIn = Coin.decode(reader, reader.uint32());
          break;
        case 4:
          message.tokenOutMinAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSwapExactAmountIn {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      routes: Array.isArray(object?.routes)
        ? object.routes.map((e: any) => SwapAmountInRoute.fromJSON(e))
        : [],
      tokenIn: isSet(object.tokenIn)
        ? Coin.fromJSON(object.tokenIn)
        : undefined,
      tokenOutMinAmount: isSet(object.tokenOutMinAmount)
        ? String(object.tokenOutMinAmount)
        : '',
    };
  },
  toJSON(message: MsgSwapExactAmountIn): JsonSafe<MsgSwapExactAmountIn> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    if (message.routes) {
      obj.routes = message.routes.map(e =>
        e ? SwapAmountInRoute.toJSON(e) : undefined,
      );
    } else {
      obj.routes = [];
    }
    message.tokenIn !== undefined &&
      (obj.tokenIn = message.tokenIn
        ? Coin.toJSON(message.tokenIn)
        : undefined);
    message.tokenOutMinAmount !== undefined &&
      (obj.tokenOutMinAmount = message.tokenOutMinAmount);
    return obj;
  },
  fromPartial(object: Partial<MsgSwapExactAmountIn>): MsgSwapExactAmountIn {
    const message = createBaseMsgSwapExactAmountIn();
    message.sender = object.sender ?? '';
    message.routes =
      object.routes?.map(e => SwapAmountInRoute.fromPartial(e)) || [];
    message.tokenIn =
      object.tokenIn !== undefined && object.tokenIn !== null
        ? Coin.fromPartial(object.tokenIn)
        : undefined;
    message.tokenOutMinAmount = object.tokenOutMinAmount ?? '';
    return message;
  },
  fromProtoMsg(message: MsgSwapExactAmountInProtoMsg): MsgSwapExactAmountIn {
    return MsgSwapExactAmountIn.decode(message.value);
  },
  toProto(message: MsgSwapExactAmountIn): Uint8Array {
    return MsgSwapExactAmountIn.encode(message).finish();
  },
  toProtoMsg(message: MsgSwapExactAmountIn): MsgSwapExactAmountInProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountIn',
      value: MsgSwapExactAmountIn.encode(message).finish(),
    };
  },
};
function createBaseMsgSwapExactAmountInResponse(): MsgSwapExactAmountInResponse {
  return {
    tokenOutAmount: '',
  };
}
export const MsgSwapExactAmountInResponse = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountInResponse',
  encode(
    message: MsgSwapExactAmountInResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tokenOutAmount !== '') {
      writer.uint32(10).string(message.tokenOutAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSwapExactAmountInResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSwapExactAmountInResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tokenOutAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSwapExactAmountInResponse {
    return {
      tokenOutAmount: isSet(object.tokenOutAmount)
        ? String(object.tokenOutAmount)
        : '',
    };
  },
  toJSON(
    message: MsgSwapExactAmountInResponse,
  ): JsonSafe<MsgSwapExactAmountInResponse> {
    const obj: any = {};
    message.tokenOutAmount !== undefined &&
      (obj.tokenOutAmount = message.tokenOutAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgSwapExactAmountInResponse>,
  ): MsgSwapExactAmountInResponse {
    const message = createBaseMsgSwapExactAmountInResponse();
    message.tokenOutAmount = object.tokenOutAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgSwapExactAmountInResponseProtoMsg,
  ): MsgSwapExactAmountInResponse {
    return MsgSwapExactAmountInResponse.decode(message.value);
  },
  toProto(message: MsgSwapExactAmountInResponse): Uint8Array {
    return MsgSwapExactAmountInResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSwapExactAmountInResponse,
  ): MsgSwapExactAmountInResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountInResponse',
      value: MsgSwapExactAmountInResponse.encode(message).finish(),
    };
  },
};
function createBaseSwapAmountOutRoute(): SwapAmountOutRoute {
  return {
    poolId: BigInt(0),
    tokenInDenom: '',
  };
}
export const SwapAmountOutRoute = {
  typeUrl: '/osmosis.gamm.v1beta1.SwapAmountOutRoute',
  encode(
    message: SwapAmountOutRoute,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.tokenInDenom !== '') {
      writer.uint32(18).string(message.tokenInDenom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SwapAmountOutRoute {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSwapAmountOutRoute();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.tokenInDenom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SwapAmountOutRoute {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      tokenInDenom: isSet(object.tokenInDenom)
        ? String(object.tokenInDenom)
        : '',
    };
  },
  toJSON(message: SwapAmountOutRoute): JsonSafe<SwapAmountOutRoute> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.tokenInDenom !== undefined &&
      (obj.tokenInDenom = message.tokenInDenom);
    return obj;
  },
  fromPartial(object: Partial<SwapAmountOutRoute>): SwapAmountOutRoute {
    const message = createBaseSwapAmountOutRoute();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.tokenInDenom = object.tokenInDenom ?? '';
    return message;
  },
  fromProtoMsg(message: SwapAmountOutRouteProtoMsg): SwapAmountOutRoute {
    return SwapAmountOutRoute.decode(message.value);
  },
  toProto(message: SwapAmountOutRoute): Uint8Array {
    return SwapAmountOutRoute.encode(message).finish();
  },
  toProtoMsg(message: SwapAmountOutRoute): SwapAmountOutRouteProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.SwapAmountOutRoute',
      value: SwapAmountOutRoute.encode(message).finish(),
    };
  },
};
function createBaseMsgSwapExactAmountOut(): MsgSwapExactAmountOut {
  return {
    sender: '',
    routes: [],
    tokenInMaxAmount: '',
    tokenOut: Coin.fromPartial({}),
  };
}
export const MsgSwapExactAmountOut = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountOut',
  encode(
    message: MsgSwapExactAmountOut,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    for (const v of message.routes) {
      SwapAmountOutRoute.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.tokenInMaxAmount !== '') {
      writer.uint32(26).string(message.tokenInMaxAmount);
    }
    if (message.tokenOut !== undefined) {
      Coin.encode(message.tokenOut, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSwapExactAmountOut {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSwapExactAmountOut();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.routes.push(
            SwapAmountOutRoute.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.tokenInMaxAmount = reader.string();
          break;
        case 4:
          message.tokenOut = Coin.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSwapExactAmountOut {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      routes: Array.isArray(object?.routes)
        ? object.routes.map((e: any) => SwapAmountOutRoute.fromJSON(e))
        : [],
      tokenInMaxAmount: isSet(object.tokenInMaxAmount)
        ? String(object.tokenInMaxAmount)
        : '',
      tokenOut: isSet(object.tokenOut)
        ? Coin.fromJSON(object.tokenOut)
        : undefined,
    };
  },
  toJSON(message: MsgSwapExactAmountOut): JsonSafe<MsgSwapExactAmountOut> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    if (message.routes) {
      obj.routes = message.routes.map(e =>
        e ? SwapAmountOutRoute.toJSON(e) : undefined,
      );
    } else {
      obj.routes = [];
    }
    message.tokenInMaxAmount !== undefined &&
      (obj.tokenInMaxAmount = message.tokenInMaxAmount);
    message.tokenOut !== undefined &&
      (obj.tokenOut = message.tokenOut
        ? Coin.toJSON(message.tokenOut)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgSwapExactAmountOut>): MsgSwapExactAmountOut {
    const message = createBaseMsgSwapExactAmountOut();
    message.sender = object.sender ?? '';
    message.routes =
      object.routes?.map(e => SwapAmountOutRoute.fromPartial(e)) || [];
    message.tokenInMaxAmount = object.tokenInMaxAmount ?? '';
    message.tokenOut =
      object.tokenOut !== undefined && object.tokenOut !== null
        ? Coin.fromPartial(object.tokenOut)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgSwapExactAmountOutProtoMsg): MsgSwapExactAmountOut {
    return MsgSwapExactAmountOut.decode(message.value);
  },
  toProto(message: MsgSwapExactAmountOut): Uint8Array {
    return MsgSwapExactAmountOut.encode(message).finish();
  },
  toProtoMsg(message: MsgSwapExactAmountOut): MsgSwapExactAmountOutProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountOut',
      value: MsgSwapExactAmountOut.encode(message).finish(),
    };
  },
};
function createBaseMsgSwapExactAmountOutResponse(): MsgSwapExactAmountOutResponse {
  return {
    tokenInAmount: '',
  };
}
export const MsgSwapExactAmountOutResponse = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountOutResponse',
  encode(
    message: MsgSwapExactAmountOutResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tokenInAmount !== '') {
      writer.uint32(10).string(message.tokenInAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSwapExactAmountOutResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSwapExactAmountOutResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tokenInAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSwapExactAmountOutResponse {
    return {
      tokenInAmount: isSet(object.tokenInAmount)
        ? String(object.tokenInAmount)
        : '',
    };
  },
  toJSON(
    message: MsgSwapExactAmountOutResponse,
  ): JsonSafe<MsgSwapExactAmountOutResponse> {
    const obj: any = {};
    message.tokenInAmount !== undefined &&
      (obj.tokenInAmount = message.tokenInAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgSwapExactAmountOutResponse>,
  ): MsgSwapExactAmountOutResponse {
    const message = createBaseMsgSwapExactAmountOutResponse();
    message.tokenInAmount = object.tokenInAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgSwapExactAmountOutResponseProtoMsg,
  ): MsgSwapExactAmountOutResponse {
    return MsgSwapExactAmountOutResponse.decode(message.value);
  },
  toProto(message: MsgSwapExactAmountOutResponse): Uint8Array {
    return MsgSwapExactAmountOutResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSwapExactAmountOutResponse,
  ): MsgSwapExactAmountOutResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgSwapExactAmountOutResponse',
      value: MsgSwapExactAmountOutResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgJoinSwapExternAmountIn(): MsgJoinSwapExternAmountIn {
  return {
    sender: '',
    poolId: BigInt(0),
    tokenIn: Coin.fromPartial({}),
    shareOutMinAmount: '',
  };
}
export const MsgJoinSwapExternAmountIn = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapExternAmountIn',
  encode(
    message: MsgJoinSwapExternAmountIn,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    if (message.tokenIn !== undefined) {
      Coin.encode(message.tokenIn, writer.uint32(26).fork()).ldelim();
    }
    if (message.shareOutMinAmount !== '') {
      writer.uint32(34).string(message.shareOutMinAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgJoinSwapExternAmountIn {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgJoinSwapExternAmountIn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolId = reader.uint64();
          break;
        case 3:
          message.tokenIn = Coin.decode(reader, reader.uint32());
          break;
        case 4:
          message.shareOutMinAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgJoinSwapExternAmountIn {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      tokenIn: isSet(object.tokenIn)
        ? Coin.fromJSON(object.tokenIn)
        : undefined,
      shareOutMinAmount: isSet(object.shareOutMinAmount)
        ? String(object.shareOutMinAmount)
        : '',
    };
  },
  toJSON(
    message: MsgJoinSwapExternAmountIn,
  ): JsonSafe<MsgJoinSwapExternAmountIn> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.tokenIn !== undefined &&
      (obj.tokenIn = message.tokenIn
        ? Coin.toJSON(message.tokenIn)
        : undefined);
    message.shareOutMinAmount !== undefined &&
      (obj.shareOutMinAmount = message.shareOutMinAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgJoinSwapExternAmountIn>,
  ): MsgJoinSwapExternAmountIn {
    const message = createBaseMsgJoinSwapExternAmountIn();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.tokenIn =
      object.tokenIn !== undefined && object.tokenIn !== null
        ? Coin.fromPartial(object.tokenIn)
        : undefined;
    message.shareOutMinAmount = object.shareOutMinAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgJoinSwapExternAmountInProtoMsg,
  ): MsgJoinSwapExternAmountIn {
    return MsgJoinSwapExternAmountIn.decode(message.value);
  },
  toProto(message: MsgJoinSwapExternAmountIn): Uint8Array {
    return MsgJoinSwapExternAmountIn.encode(message).finish();
  },
  toProtoMsg(
    message: MsgJoinSwapExternAmountIn,
  ): MsgJoinSwapExternAmountInProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapExternAmountIn',
      value: MsgJoinSwapExternAmountIn.encode(message).finish(),
    };
  },
};
function createBaseMsgJoinSwapExternAmountInResponse(): MsgJoinSwapExternAmountInResponse {
  return {
    shareOutAmount: '',
  };
}
export const MsgJoinSwapExternAmountInResponse = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapExternAmountInResponse',
  encode(
    message: MsgJoinSwapExternAmountInResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.shareOutAmount !== '') {
      writer.uint32(10).string(message.shareOutAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgJoinSwapExternAmountInResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgJoinSwapExternAmountInResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.shareOutAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgJoinSwapExternAmountInResponse {
    return {
      shareOutAmount: isSet(object.shareOutAmount)
        ? String(object.shareOutAmount)
        : '',
    };
  },
  toJSON(
    message: MsgJoinSwapExternAmountInResponse,
  ): JsonSafe<MsgJoinSwapExternAmountInResponse> {
    const obj: any = {};
    message.shareOutAmount !== undefined &&
      (obj.shareOutAmount = message.shareOutAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgJoinSwapExternAmountInResponse>,
  ): MsgJoinSwapExternAmountInResponse {
    const message = createBaseMsgJoinSwapExternAmountInResponse();
    message.shareOutAmount = object.shareOutAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgJoinSwapExternAmountInResponseProtoMsg,
  ): MsgJoinSwapExternAmountInResponse {
    return MsgJoinSwapExternAmountInResponse.decode(message.value);
  },
  toProto(message: MsgJoinSwapExternAmountInResponse): Uint8Array {
    return MsgJoinSwapExternAmountInResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgJoinSwapExternAmountInResponse,
  ): MsgJoinSwapExternAmountInResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapExternAmountInResponse',
      value: MsgJoinSwapExternAmountInResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgJoinSwapShareAmountOut(): MsgJoinSwapShareAmountOut {
  return {
    sender: '',
    poolId: BigInt(0),
    tokenInDenom: '',
    shareOutAmount: '',
    tokenInMaxAmount: '',
  };
}
export const MsgJoinSwapShareAmountOut = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapShareAmountOut',
  encode(
    message: MsgJoinSwapShareAmountOut,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    if (message.tokenInDenom !== '') {
      writer.uint32(26).string(message.tokenInDenom);
    }
    if (message.shareOutAmount !== '') {
      writer.uint32(34).string(message.shareOutAmount);
    }
    if (message.tokenInMaxAmount !== '') {
      writer.uint32(42).string(message.tokenInMaxAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgJoinSwapShareAmountOut {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgJoinSwapShareAmountOut();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolId = reader.uint64();
          break;
        case 3:
          message.tokenInDenom = reader.string();
          break;
        case 4:
          message.shareOutAmount = reader.string();
          break;
        case 5:
          message.tokenInMaxAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgJoinSwapShareAmountOut {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      tokenInDenom: isSet(object.tokenInDenom)
        ? String(object.tokenInDenom)
        : '',
      shareOutAmount: isSet(object.shareOutAmount)
        ? String(object.shareOutAmount)
        : '',
      tokenInMaxAmount: isSet(object.tokenInMaxAmount)
        ? String(object.tokenInMaxAmount)
        : '',
    };
  },
  toJSON(
    message: MsgJoinSwapShareAmountOut,
  ): JsonSafe<MsgJoinSwapShareAmountOut> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.tokenInDenom !== undefined &&
      (obj.tokenInDenom = message.tokenInDenom);
    message.shareOutAmount !== undefined &&
      (obj.shareOutAmount = message.shareOutAmount);
    message.tokenInMaxAmount !== undefined &&
      (obj.tokenInMaxAmount = message.tokenInMaxAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgJoinSwapShareAmountOut>,
  ): MsgJoinSwapShareAmountOut {
    const message = createBaseMsgJoinSwapShareAmountOut();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.tokenInDenom = object.tokenInDenom ?? '';
    message.shareOutAmount = object.shareOutAmount ?? '';
    message.tokenInMaxAmount = object.tokenInMaxAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgJoinSwapShareAmountOutProtoMsg,
  ): MsgJoinSwapShareAmountOut {
    return MsgJoinSwapShareAmountOut.decode(message.value);
  },
  toProto(message: MsgJoinSwapShareAmountOut): Uint8Array {
    return MsgJoinSwapShareAmountOut.encode(message).finish();
  },
  toProtoMsg(
    message: MsgJoinSwapShareAmountOut,
  ): MsgJoinSwapShareAmountOutProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapShareAmountOut',
      value: MsgJoinSwapShareAmountOut.encode(message).finish(),
    };
  },
};
function createBaseMsgJoinSwapShareAmountOutResponse(): MsgJoinSwapShareAmountOutResponse {
  return {
    tokenInAmount: '',
  };
}
export const MsgJoinSwapShareAmountOutResponse = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapShareAmountOutResponse',
  encode(
    message: MsgJoinSwapShareAmountOutResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tokenInAmount !== '') {
      writer.uint32(10).string(message.tokenInAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgJoinSwapShareAmountOutResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgJoinSwapShareAmountOutResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tokenInAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgJoinSwapShareAmountOutResponse {
    return {
      tokenInAmount: isSet(object.tokenInAmount)
        ? String(object.tokenInAmount)
        : '',
    };
  },
  toJSON(
    message: MsgJoinSwapShareAmountOutResponse,
  ): JsonSafe<MsgJoinSwapShareAmountOutResponse> {
    const obj: any = {};
    message.tokenInAmount !== undefined &&
      (obj.tokenInAmount = message.tokenInAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgJoinSwapShareAmountOutResponse>,
  ): MsgJoinSwapShareAmountOutResponse {
    const message = createBaseMsgJoinSwapShareAmountOutResponse();
    message.tokenInAmount = object.tokenInAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgJoinSwapShareAmountOutResponseProtoMsg,
  ): MsgJoinSwapShareAmountOutResponse {
    return MsgJoinSwapShareAmountOutResponse.decode(message.value);
  },
  toProto(message: MsgJoinSwapShareAmountOutResponse): Uint8Array {
    return MsgJoinSwapShareAmountOutResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgJoinSwapShareAmountOutResponse,
  ): MsgJoinSwapShareAmountOutResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgJoinSwapShareAmountOutResponse',
      value: MsgJoinSwapShareAmountOutResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgExitSwapShareAmountIn(): MsgExitSwapShareAmountIn {
  return {
    sender: '',
    poolId: BigInt(0),
    tokenOutDenom: '',
    shareInAmount: '',
    tokenOutMinAmount: '',
  };
}
export const MsgExitSwapShareAmountIn = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapShareAmountIn',
  encode(
    message: MsgExitSwapShareAmountIn,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    if (message.tokenOutDenom !== '') {
      writer.uint32(26).string(message.tokenOutDenom);
    }
    if (message.shareInAmount !== '') {
      writer.uint32(34).string(message.shareInAmount);
    }
    if (message.tokenOutMinAmount !== '') {
      writer.uint32(42).string(message.tokenOutMinAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgExitSwapShareAmountIn {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExitSwapShareAmountIn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolId = reader.uint64();
          break;
        case 3:
          message.tokenOutDenom = reader.string();
          break;
        case 4:
          message.shareInAmount = reader.string();
          break;
        case 5:
          message.tokenOutMinAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExitSwapShareAmountIn {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      tokenOutDenom: isSet(object.tokenOutDenom)
        ? String(object.tokenOutDenom)
        : '',
      shareInAmount: isSet(object.shareInAmount)
        ? String(object.shareInAmount)
        : '',
      tokenOutMinAmount: isSet(object.tokenOutMinAmount)
        ? String(object.tokenOutMinAmount)
        : '',
    };
  },
  toJSON(
    message: MsgExitSwapShareAmountIn,
  ): JsonSafe<MsgExitSwapShareAmountIn> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.tokenOutDenom !== undefined &&
      (obj.tokenOutDenom = message.tokenOutDenom);
    message.shareInAmount !== undefined &&
      (obj.shareInAmount = message.shareInAmount);
    message.tokenOutMinAmount !== undefined &&
      (obj.tokenOutMinAmount = message.tokenOutMinAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgExitSwapShareAmountIn>,
  ): MsgExitSwapShareAmountIn {
    const message = createBaseMsgExitSwapShareAmountIn();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.tokenOutDenom = object.tokenOutDenom ?? '';
    message.shareInAmount = object.shareInAmount ?? '';
    message.tokenOutMinAmount = object.tokenOutMinAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgExitSwapShareAmountInProtoMsg,
  ): MsgExitSwapShareAmountIn {
    return MsgExitSwapShareAmountIn.decode(message.value);
  },
  toProto(message: MsgExitSwapShareAmountIn): Uint8Array {
    return MsgExitSwapShareAmountIn.encode(message).finish();
  },
  toProtoMsg(
    message: MsgExitSwapShareAmountIn,
  ): MsgExitSwapShareAmountInProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapShareAmountIn',
      value: MsgExitSwapShareAmountIn.encode(message).finish(),
    };
  },
};
function createBaseMsgExitSwapShareAmountInResponse(): MsgExitSwapShareAmountInResponse {
  return {
    tokenOutAmount: '',
  };
}
export const MsgExitSwapShareAmountInResponse = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapShareAmountInResponse',
  encode(
    message: MsgExitSwapShareAmountInResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tokenOutAmount !== '') {
      writer.uint32(10).string(message.tokenOutAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgExitSwapShareAmountInResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExitSwapShareAmountInResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tokenOutAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExitSwapShareAmountInResponse {
    return {
      tokenOutAmount: isSet(object.tokenOutAmount)
        ? String(object.tokenOutAmount)
        : '',
    };
  },
  toJSON(
    message: MsgExitSwapShareAmountInResponse,
  ): JsonSafe<MsgExitSwapShareAmountInResponse> {
    const obj: any = {};
    message.tokenOutAmount !== undefined &&
      (obj.tokenOutAmount = message.tokenOutAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgExitSwapShareAmountInResponse>,
  ): MsgExitSwapShareAmountInResponse {
    const message = createBaseMsgExitSwapShareAmountInResponse();
    message.tokenOutAmount = object.tokenOutAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgExitSwapShareAmountInResponseProtoMsg,
  ): MsgExitSwapShareAmountInResponse {
    return MsgExitSwapShareAmountInResponse.decode(message.value);
  },
  toProto(message: MsgExitSwapShareAmountInResponse): Uint8Array {
    return MsgExitSwapShareAmountInResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgExitSwapShareAmountInResponse,
  ): MsgExitSwapShareAmountInResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapShareAmountInResponse',
      value: MsgExitSwapShareAmountInResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgExitSwapExternAmountOut(): MsgExitSwapExternAmountOut {
  return {
    sender: '',
    poolId: BigInt(0),
    tokenOut: Coin.fromPartial({}),
    shareInMaxAmount: '',
  };
}
export const MsgExitSwapExternAmountOut = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapExternAmountOut',
  encode(
    message: MsgExitSwapExternAmountOut,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    if (message.tokenOut !== undefined) {
      Coin.encode(message.tokenOut, writer.uint32(26).fork()).ldelim();
    }
    if (message.shareInMaxAmount !== '') {
      writer.uint32(34).string(message.shareInMaxAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgExitSwapExternAmountOut {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExitSwapExternAmountOut();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolId = reader.uint64();
          break;
        case 3:
          message.tokenOut = Coin.decode(reader, reader.uint32());
          break;
        case 4:
          message.shareInMaxAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExitSwapExternAmountOut {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      tokenOut: isSet(object.tokenOut)
        ? Coin.fromJSON(object.tokenOut)
        : undefined,
      shareInMaxAmount: isSet(object.shareInMaxAmount)
        ? String(object.shareInMaxAmount)
        : '',
    };
  },
  toJSON(
    message: MsgExitSwapExternAmountOut,
  ): JsonSafe<MsgExitSwapExternAmountOut> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.tokenOut !== undefined &&
      (obj.tokenOut = message.tokenOut
        ? Coin.toJSON(message.tokenOut)
        : undefined);
    message.shareInMaxAmount !== undefined &&
      (obj.shareInMaxAmount = message.shareInMaxAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgExitSwapExternAmountOut>,
  ): MsgExitSwapExternAmountOut {
    const message = createBaseMsgExitSwapExternAmountOut();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.tokenOut =
      object.tokenOut !== undefined && object.tokenOut !== null
        ? Coin.fromPartial(object.tokenOut)
        : undefined;
    message.shareInMaxAmount = object.shareInMaxAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgExitSwapExternAmountOutProtoMsg,
  ): MsgExitSwapExternAmountOut {
    return MsgExitSwapExternAmountOut.decode(message.value);
  },
  toProto(message: MsgExitSwapExternAmountOut): Uint8Array {
    return MsgExitSwapExternAmountOut.encode(message).finish();
  },
  toProtoMsg(
    message: MsgExitSwapExternAmountOut,
  ): MsgExitSwapExternAmountOutProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapExternAmountOut',
      value: MsgExitSwapExternAmountOut.encode(message).finish(),
    };
  },
};
function createBaseMsgExitSwapExternAmountOutResponse(): MsgExitSwapExternAmountOutResponse {
  return {
    shareInAmount: '',
  };
}
export const MsgExitSwapExternAmountOutResponse = {
  typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapExternAmountOutResponse',
  encode(
    message: MsgExitSwapExternAmountOutResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.shareInAmount !== '') {
      writer.uint32(10).string(message.shareInAmount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgExitSwapExternAmountOutResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExitSwapExternAmountOutResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.shareInAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExitSwapExternAmountOutResponse {
    return {
      shareInAmount: isSet(object.shareInAmount)
        ? String(object.shareInAmount)
        : '',
    };
  },
  toJSON(
    message: MsgExitSwapExternAmountOutResponse,
  ): JsonSafe<MsgExitSwapExternAmountOutResponse> {
    const obj: any = {};
    message.shareInAmount !== undefined &&
      (obj.shareInAmount = message.shareInAmount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgExitSwapExternAmountOutResponse>,
  ): MsgExitSwapExternAmountOutResponse {
    const message = createBaseMsgExitSwapExternAmountOutResponse();
    message.shareInAmount = object.shareInAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgExitSwapExternAmountOutResponseProtoMsg,
  ): MsgExitSwapExternAmountOutResponse {
    return MsgExitSwapExternAmountOutResponse.decode(message.value);
  },
  toProto(message: MsgExitSwapExternAmountOutResponse): Uint8Array {
    return MsgExitSwapExternAmountOutResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgExitSwapExternAmountOutResponse,
  ): MsgExitSwapExternAmountOutResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v1beta1.MsgExitSwapExternAmountOutResponse',
      value: MsgExitSwapExternAmountOutResponse.encode(message).finish(),
    };
  },
};
