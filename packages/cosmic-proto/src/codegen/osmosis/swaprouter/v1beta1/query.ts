//@ts-nocheck
import {
  SwapAmountInRoute,
  SwapAmountInRouteSDKType,
  SwapAmountOutRoute,
  SwapAmountOutRouteSDKType,
} from './swap_route.js';
import { Params, ParamsSDKType } from './genesis.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/** =============================== Params */
export interface ParamsRequest {}
export interface ParamsRequestProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.ParamsRequest';
  value: Uint8Array;
}
/** =============================== Params */
export interface ParamsRequestSDKType {}
export interface ParamsResponse {
  params: Params;
}
export interface ParamsResponseProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.ParamsResponse';
  value: Uint8Array;
}
export interface ParamsResponseSDKType {
  params: ParamsSDKType;
}
/** =============================== EstimateSwapExactAmountIn */
export interface EstimateSwapExactAmountInRequest {
  /** TODO: CHANGE THIS TO RESERVED IN A PATCH RELEASE */
  sender: string;
  poolId: bigint;
  tokenIn: string;
  routes: SwapAmountInRoute[];
}
export interface EstimateSwapExactAmountInRequestProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountInRequest';
  value: Uint8Array;
}
/** =============================== EstimateSwapExactAmountIn */
export interface EstimateSwapExactAmountInRequestSDKType {
  sender: string;
  pool_id: bigint;
  token_in: string;
  routes: SwapAmountInRouteSDKType[];
}
export interface EstimateSwapExactAmountInResponse {
  tokenOutAmount: string;
}
export interface EstimateSwapExactAmountInResponseProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountInResponse';
  value: Uint8Array;
}
export interface EstimateSwapExactAmountInResponseSDKType {
  token_out_amount: string;
}
/** =============================== EstimateSwapExactAmountOut */
export interface EstimateSwapExactAmountOutRequest {
  /** TODO: CHANGE THIS TO RESERVED IN A PATCH RELEASE */
  sender: string;
  poolId: bigint;
  routes: SwapAmountOutRoute[];
  tokenOut: string;
}
export interface EstimateSwapExactAmountOutRequestProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountOutRequest';
  value: Uint8Array;
}
/** =============================== EstimateSwapExactAmountOut */
export interface EstimateSwapExactAmountOutRequestSDKType {
  sender: string;
  pool_id: bigint;
  routes: SwapAmountOutRouteSDKType[];
  token_out: string;
}
export interface EstimateSwapExactAmountOutResponse {
  tokenInAmount: string;
}
export interface EstimateSwapExactAmountOutResponseProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountOutResponse';
  value: Uint8Array;
}
export interface EstimateSwapExactAmountOutResponseSDKType {
  token_in_amount: string;
}
/** =============================== NumPools */
export interface NumPoolsRequest {}
export interface NumPoolsRequestProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.NumPoolsRequest';
  value: Uint8Array;
}
/** =============================== NumPools */
export interface NumPoolsRequestSDKType {}
export interface NumPoolsResponse {
  numPools: bigint;
}
export interface NumPoolsResponseProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.NumPoolsResponse';
  value: Uint8Array;
}
export interface NumPoolsResponseSDKType {
  num_pools: bigint;
}
function createBaseParamsRequest(): ParamsRequest {
  return {};
}
export const ParamsRequest = {
  typeUrl: '/osmosis.swaprouter.v1beta1.ParamsRequest',
  encode(
    _: ParamsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ParamsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParamsRequest();
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
  fromJSON(_: any): ParamsRequest {
    return {};
  },
  toJSON(_: ParamsRequest): JsonSafe<ParamsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<ParamsRequest>): ParamsRequest {
    const message = createBaseParamsRequest();
    return message;
  },
  fromProtoMsg(message: ParamsRequestProtoMsg): ParamsRequest {
    return ParamsRequest.decode(message.value);
  },
  toProto(message: ParamsRequest): Uint8Array {
    return ParamsRequest.encode(message).finish();
  },
  toProtoMsg(message: ParamsRequest): ParamsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.ParamsRequest',
      value: ParamsRequest.encode(message).finish(),
    };
  },
};
function createBaseParamsResponse(): ParamsResponse {
  return {
    params: Params.fromPartial({}),
  };
}
export const ParamsResponse = {
  typeUrl: '/osmosis.swaprouter.v1beta1.ParamsResponse',
  encode(
    message: ParamsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ParamsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParamsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ParamsResponse {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: ParamsResponse): JsonSafe<ParamsResponse> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<ParamsResponse>): ParamsResponse {
    const message = createBaseParamsResponse();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
  fromProtoMsg(message: ParamsResponseProtoMsg): ParamsResponse {
    return ParamsResponse.decode(message.value);
  },
  toProto(message: ParamsResponse): Uint8Array {
    return ParamsResponse.encode(message).finish();
  },
  toProtoMsg(message: ParamsResponse): ParamsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.ParamsResponse',
      value: ParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseEstimateSwapExactAmountInRequest(): EstimateSwapExactAmountInRequest {
  return {
    sender: '',
    poolId: BigInt(0),
    tokenIn: '',
    routes: [],
  };
}
export const EstimateSwapExactAmountInRequest = {
  typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountInRequest',
  encode(
    message: EstimateSwapExactAmountInRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    if (message.tokenIn !== '') {
      writer.uint32(26).string(message.tokenIn);
    }
    for (const v of message.routes) {
      SwapAmountInRoute.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): EstimateSwapExactAmountInRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEstimateSwapExactAmountInRequest();
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
          message.tokenIn = reader.string();
          break;
        case 4:
          message.routes.push(
            SwapAmountInRoute.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EstimateSwapExactAmountInRequest {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      tokenIn: isSet(object.tokenIn) ? String(object.tokenIn) : '',
      routes: Array.isArray(object?.routes)
        ? object.routes.map((e: any) => SwapAmountInRoute.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: EstimateSwapExactAmountInRequest,
  ): JsonSafe<EstimateSwapExactAmountInRequest> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.tokenIn !== undefined && (obj.tokenIn = message.tokenIn);
    if (message.routes) {
      obj.routes = message.routes.map(e =>
        e ? SwapAmountInRoute.toJSON(e) : undefined,
      );
    } else {
      obj.routes = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<EstimateSwapExactAmountInRequest>,
  ): EstimateSwapExactAmountInRequest {
    const message = createBaseEstimateSwapExactAmountInRequest();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.tokenIn = object.tokenIn ?? '';
    message.routes =
      object.routes?.map(e => SwapAmountInRoute.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: EstimateSwapExactAmountInRequestProtoMsg,
  ): EstimateSwapExactAmountInRequest {
    return EstimateSwapExactAmountInRequest.decode(message.value);
  },
  toProto(message: EstimateSwapExactAmountInRequest): Uint8Array {
    return EstimateSwapExactAmountInRequest.encode(message).finish();
  },
  toProtoMsg(
    message: EstimateSwapExactAmountInRequest,
  ): EstimateSwapExactAmountInRequestProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountInRequest',
      value: EstimateSwapExactAmountInRequest.encode(message).finish(),
    };
  },
};
function createBaseEstimateSwapExactAmountInResponse(): EstimateSwapExactAmountInResponse {
  return {
    tokenOutAmount: '',
  };
}
export const EstimateSwapExactAmountInResponse = {
  typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountInResponse',
  encode(
    message: EstimateSwapExactAmountInResponse,
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
  ): EstimateSwapExactAmountInResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEstimateSwapExactAmountInResponse();
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
  fromJSON(object: any): EstimateSwapExactAmountInResponse {
    return {
      tokenOutAmount: isSet(object.tokenOutAmount)
        ? String(object.tokenOutAmount)
        : '',
    };
  },
  toJSON(
    message: EstimateSwapExactAmountInResponse,
  ): JsonSafe<EstimateSwapExactAmountInResponse> {
    const obj: any = {};
    message.tokenOutAmount !== undefined &&
      (obj.tokenOutAmount = message.tokenOutAmount);
    return obj;
  },
  fromPartial(
    object: Partial<EstimateSwapExactAmountInResponse>,
  ): EstimateSwapExactAmountInResponse {
    const message = createBaseEstimateSwapExactAmountInResponse();
    message.tokenOutAmount = object.tokenOutAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: EstimateSwapExactAmountInResponseProtoMsg,
  ): EstimateSwapExactAmountInResponse {
    return EstimateSwapExactAmountInResponse.decode(message.value);
  },
  toProto(message: EstimateSwapExactAmountInResponse): Uint8Array {
    return EstimateSwapExactAmountInResponse.encode(message).finish();
  },
  toProtoMsg(
    message: EstimateSwapExactAmountInResponse,
  ): EstimateSwapExactAmountInResponseProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountInResponse',
      value: EstimateSwapExactAmountInResponse.encode(message).finish(),
    };
  },
};
function createBaseEstimateSwapExactAmountOutRequest(): EstimateSwapExactAmountOutRequest {
  return {
    sender: '',
    poolId: BigInt(0),
    routes: [],
    tokenOut: '',
  };
}
export const EstimateSwapExactAmountOutRequest = {
  typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountOutRequest',
  encode(
    message: EstimateSwapExactAmountOutRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    for (const v of message.routes) {
      SwapAmountOutRoute.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.tokenOut !== '') {
      writer.uint32(34).string(message.tokenOut);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): EstimateSwapExactAmountOutRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEstimateSwapExactAmountOutRequest();
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
          message.routes.push(
            SwapAmountOutRoute.decode(reader, reader.uint32()),
          );
          break;
        case 4:
          message.tokenOut = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EstimateSwapExactAmountOutRequest {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      routes: Array.isArray(object?.routes)
        ? object.routes.map((e: any) => SwapAmountOutRoute.fromJSON(e))
        : [],
      tokenOut: isSet(object.tokenOut) ? String(object.tokenOut) : '',
    };
  },
  toJSON(
    message: EstimateSwapExactAmountOutRequest,
  ): JsonSafe<EstimateSwapExactAmountOutRequest> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    if (message.routes) {
      obj.routes = message.routes.map(e =>
        e ? SwapAmountOutRoute.toJSON(e) : undefined,
      );
    } else {
      obj.routes = [];
    }
    message.tokenOut !== undefined && (obj.tokenOut = message.tokenOut);
    return obj;
  },
  fromPartial(
    object: Partial<EstimateSwapExactAmountOutRequest>,
  ): EstimateSwapExactAmountOutRequest {
    const message = createBaseEstimateSwapExactAmountOutRequest();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.routes =
      object.routes?.map(e => SwapAmountOutRoute.fromPartial(e)) || [];
    message.tokenOut = object.tokenOut ?? '';
    return message;
  },
  fromProtoMsg(
    message: EstimateSwapExactAmountOutRequestProtoMsg,
  ): EstimateSwapExactAmountOutRequest {
    return EstimateSwapExactAmountOutRequest.decode(message.value);
  },
  toProto(message: EstimateSwapExactAmountOutRequest): Uint8Array {
    return EstimateSwapExactAmountOutRequest.encode(message).finish();
  },
  toProtoMsg(
    message: EstimateSwapExactAmountOutRequest,
  ): EstimateSwapExactAmountOutRequestProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountOutRequest',
      value: EstimateSwapExactAmountOutRequest.encode(message).finish(),
    };
  },
};
function createBaseEstimateSwapExactAmountOutResponse(): EstimateSwapExactAmountOutResponse {
  return {
    tokenInAmount: '',
  };
}
export const EstimateSwapExactAmountOutResponse = {
  typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountOutResponse',
  encode(
    message: EstimateSwapExactAmountOutResponse,
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
  ): EstimateSwapExactAmountOutResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEstimateSwapExactAmountOutResponse();
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
  fromJSON(object: any): EstimateSwapExactAmountOutResponse {
    return {
      tokenInAmount: isSet(object.tokenInAmount)
        ? String(object.tokenInAmount)
        : '',
    };
  },
  toJSON(
    message: EstimateSwapExactAmountOutResponse,
  ): JsonSafe<EstimateSwapExactAmountOutResponse> {
    const obj: any = {};
    message.tokenInAmount !== undefined &&
      (obj.tokenInAmount = message.tokenInAmount);
    return obj;
  },
  fromPartial(
    object: Partial<EstimateSwapExactAmountOutResponse>,
  ): EstimateSwapExactAmountOutResponse {
    const message = createBaseEstimateSwapExactAmountOutResponse();
    message.tokenInAmount = object.tokenInAmount ?? '';
    return message;
  },
  fromProtoMsg(
    message: EstimateSwapExactAmountOutResponseProtoMsg,
  ): EstimateSwapExactAmountOutResponse {
    return EstimateSwapExactAmountOutResponse.decode(message.value);
  },
  toProto(message: EstimateSwapExactAmountOutResponse): Uint8Array {
    return EstimateSwapExactAmountOutResponse.encode(message).finish();
  },
  toProtoMsg(
    message: EstimateSwapExactAmountOutResponse,
  ): EstimateSwapExactAmountOutResponseProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.EstimateSwapExactAmountOutResponse',
      value: EstimateSwapExactAmountOutResponse.encode(message).finish(),
    };
  },
};
function createBaseNumPoolsRequest(): NumPoolsRequest {
  return {};
}
export const NumPoolsRequest = {
  typeUrl: '/osmosis.swaprouter.v1beta1.NumPoolsRequest',
  encode(
    _: NumPoolsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): NumPoolsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNumPoolsRequest();
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
  fromJSON(_: any): NumPoolsRequest {
    return {};
  },
  toJSON(_: NumPoolsRequest): JsonSafe<NumPoolsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<NumPoolsRequest>): NumPoolsRequest {
    const message = createBaseNumPoolsRequest();
    return message;
  },
  fromProtoMsg(message: NumPoolsRequestProtoMsg): NumPoolsRequest {
    return NumPoolsRequest.decode(message.value);
  },
  toProto(message: NumPoolsRequest): Uint8Array {
    return NumPoolsRequest.encode(message).finish();
  },
  toProtoMsg(message: NumPoolsRequest): NumPoolsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.NumPoolsRequest',
      value: NumPoolsRequest.encode(message).finish(),
    };
  },
};
function createBaseNumPoolsResponse(): NumPoolsResponse {
  return {
    numPools: BigInt(0),
  };
}
export const NumPoolsResponse = {
  typeUrl: '/osmosis.swaprouter.v1beta1.NumPoolsResponse',
  encode(
    message: NumPoolsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.numPools !== BigInt(0)) {
      writer.uint32(8).uint64(message.numPools);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): NumPoolsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNumPoolsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.numPools = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): NumPoolsResponse {
    return {
      numPools: isSet(object.numPools)
        ? BigInt(object.numPools.toString())
        : BigInt(0),
    };
  },
  toJSON(message: NumPoolsResponse): JsonSafe<NumPoolsResponse> {
    const obj: any = {};
    message.numPools !== undefined &&
      (obj.numPools = (message.numPools || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<NumPoolsResponse>): NumPoolsResponse {
    const message = createBaseNumPoolsResponse();
    message.numPools =
      object.numPools !== undefined && object.numPools !== null
        ? BigInt(object.numPools.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: NumPoolsResponseProtoMsg): NumPoolsResponse {
    return NumPoolsResponse.decode(message.value);
  },
  toProto(message: NumPoolsResponse): Uint8Array {
    return NumPoolsResponse.encode(message).finish();
  },
  toProtoMsg(message: NumPoolsResponse): NumPoolsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.NumPoolsResponse',
      value: NumPoolsResponse.encode(message).finish(),
    };
  },
};
