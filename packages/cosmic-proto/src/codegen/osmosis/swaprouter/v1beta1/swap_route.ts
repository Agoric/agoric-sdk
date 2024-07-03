//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
export interface SwapAmountInRoute {
  poolId: bigint;
  tokenOutDenom: string;
}
export interface SwapAmountInRouteProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.SwapAmountInRoute';
  value: Uint8Array;
}
export interface SwapAmountInRouteSDKType {
  pool_id: bigint;
  token_out_denom: string;
}
export interface SwapAmountOutRoute {
  poolId: bigint;
  tokenInDenom: string;
}
export interface SwapAmountOutRouteProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.SwapAmountOutRoute';
  value: Uint8Array;
}
export interface SwapAmountOutRouteSDKType {
  pool_id: bigint;
  token_in_denom: string;
}
function createBaseSwapAmountInRoute(): SwapAmountInRoute {
  return {
    poolId: BigInt(0),
    tokenOutDenom: '',
  };
}
export const SwapAmountInRoute = {
  typeUrl: '/osmosis.swaprouter.v1beta1.SwapAmountInRoute',
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
      typeUrl: '/osmosis.swaprouter.v1beta1.SwapAmountInRoute',
      value: SwapAmountInRoute.encode(message).finish(),
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
  typeUrl: '/osmosis.swaprouter.v1beta1.SwapAmountOutRoute',
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
      typeUrl: '/osmosis.swaprouter.v1beta1.SwapAmountOutRoute',
      value: SwapAmountOutRoute.encode(message).finish(),
    };
  },
};
