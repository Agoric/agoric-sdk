//@ts-nocheck
import {
  SwapAmountInRoute,
  SwapAmountInRouteSDKType,
  SwapAmountOutRoute,
  SwapAmountOutRouteSDKType,
} from './swap_route.js';
import { Coin, CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** ===================== MsgSwapExactAmountIn */
export interface MsgSwapExactAmountIn {
  sender: string;
  routes: SwapAmountInRoute[];
  tokenIn: Coin;
  tokenOutMinAmount: string;
}
export interface MsgSwapExactAmountInProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountIn';
  value: Uint8Array;
}
/** ===================== MsgSwapExactAmountIn */
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
  typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountInResponse';
  value: Uint8Array;
}
export interface MsgSwapExactAmountInResponseSDKType {
  token_out_amount: string;
}
/** ===================== MsgSwapExactAmountOut */
export interface MsgSwapExactAmountOut {
  sender: string;
  routes: SwapAmountOutRoute[];
  tokenInMaxAmount: string;
  tokenOut: Coin;
}
export interface MsgSwapExactAmountOutProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountOut';
  value: Uint8Array;
}
/** ===================== MsgSwapExactAmountOut */
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
  typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountOutResponse';
  value: Uint8Array;
}
export interface MsgSwapExactAmountOutResponseSDKType {
  token_in_amount: string;
}
function createBaseMsgSwapExactAmountIn(): MsgSwapExactAmountIn {
  return {
    sender: '',
    routes: [],
    tokenIn: Coin.fromPartial({}),
    tokenOutMinAmount: '',
  };
}
export const MsgSwapExactAmountIn = {
  typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountIn',
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
      typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountIn',
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
  typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountInResponse',
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
      typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountInResponse',
      value: MsgSwapExactAmountInResponse.encode(message).finish(),
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
  typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountOut',
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
      typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountOut',
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
  typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountOutResponse',
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
      typeUrl: '/osmosis.swaprouter.v1beta1.MsgSwapExactAmountOutResponse',
      value: MsgSwapExactAmountOutResponse.encode(message).finish(),
    };
  },
};
