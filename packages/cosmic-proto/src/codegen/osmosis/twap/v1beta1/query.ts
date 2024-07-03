//@ts-nocheck
import {
  Timestamp,
  TimestampSDKType,
} from '../../../google/protobuf/timestamp.js';
import { Params, ParamsSDKType } from './genesis.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
import { Decimal } from '@cosmjs/math';
export interface ArithmeticTwapRequest {
  poolId: bigint;
  baseAsset: string;
  quoteAsset: string;
  startTime: Timestamp;
  endTime?: Timestamp;
}
export interface ArithmeticTwapRequestProtoMsg {
  typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapRequest';
  value: Uint8Array;
}
export interface ArithmeticTwapRequestSDKType {
  pool_id: bigint;
  base_asset: string;
  quote_asset: string;
  start_time: TimestampSDKType;
  end_time?: TimestampSDKType;
}
export interface ArithmeticTwapResponse {
  arithmeticTwap: string;
}
export interface ArithmeticTwapResponseProtoMsg {
  typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapResponse';
  value: Uint8Array;
}
export interface ArithmeticTwapResponseSDKType {
  arithmetic_twap: string;
}
export interface ArithmeticTwapToNowRequest {
  poolId: bigint;
  baseAsset: string;
  quoteAsset: string;
  startTime: Timestamp;
}
export interface ArithmeticTwapToNowRequestProtoMsg {
  typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapToNowRequest';
  value: Uint8Array;
}
export interface ArithmeticTwapToNowRequestSDKType {
  pool_id: bigint;
  base_asset: string;
  quote_asset: string;
  start_time: TimestampSDKType;
}
export interface ArithmeticTwapToNowResponse {
  arithmeticTwap: string;
}
export interface ArithmeticTwapToNowResponseProtoMsg {
  typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapToNowResponse';
  value: Uint8Array;
}
export interface ArithmeticTwapToNowResponseSDKType {
  arithmetic_twap: string;
}
export interface ParamsRequest {}
export interface ParamsRequestProtoMsg {
  typeUrl: '/osmosis.twap.v1beta1.ParamsRequest';
  value: Uint8Array;
}
export interface ParamsRequestSDKType {}
export interface ParamsResponse {
  params: Params;
}
export interface ParamsResponseProtoMsg {
  typeUrl: '/osmosis.twap.v1beta1.ParamsResponse';
  value: Uint8Array;
}
export interface ParamsResponseSDKType {
  params: ParamsSDKType;
}
function createBaseArithmeticTwapRequest(): ArithmeticTwapRequest {
  return {
    poolId: BigInt(0),
    baseAsset: '',
    quoteAsset: '',
    startTime: Timestamp.fromPartial({}),
    endTime: undefined,
  };
}
export const ArithmeticTwapRequest = {
  typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapRequest',
  encode(
    message: ArithmeticTwapRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.baseAsset !== '') {
      writer.uint32(18).string(message.baseAsset);
    }
    if (message.quoteAsset !== '') {
      writer.uint32(26).string(message.quoteAsset);
    }
    if (message.startTime !== undefined) {
      Timestamp.encode(message.startTime, writer.uint32(34).fork()).ldelim();
    }
    if (message.endTime !== undefined) {
      Timestamp.encode(message.endTime, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ArithmeticTwapRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseArithmeticTwapRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.baseAsset = reader.string();
          break;
        case 3:
          message.quoteAsset = reader.string();
          break;
        case 4:
          message.startTime = Timestamp.decode(reader, reader.uint32());
          break;
        case 5:
          message.endTime = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ArithmeticTwapRequest {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      baseAsset: isSet(object.baseAsset) ? String(object.baseAsset) : '',
      quoteAsset: isSet(object.quoteAsset) ? String(object.quoteAsset) : '',
      startTime: isSet(object.startTime)
        ? fromJsonTimestamp(object.startTime)
        : undefined,
      endTime: isSet(object.endTime)
        ? fromJsonTimestamp(object.endTime)
        : undefined,
    };
  },
  toJSON(message: ArithmeticTwapRequest): JsonSafe<ArithmeticTwapRequest> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.baseAsset !== undefined && (obj.baseAsset = message.baseAsset);
    message.quoteAsset !== undefined && (obj.quoteAsset = message.quoteAsset);
    message.startTime !== undefined &&
      (obj.startTime = fromTimestamp(message.startTime).toISOString());
    message.endTime !== undefined &&
      (obj.endTime = fromTimestamp(message.endTime).toISOString());
    return obj;
  },
  fromPartial(object: Partial<ArithmeticTwapRequest>): ArithmeticTwapRequest {
    const message = createBaseArithmeticTwapRequest();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.baseAsset = object.baseAsset ?? '';
    message.quoteAsset = object.quoteAsset ?? '';
    message.startTime =
      object.startTime !== undefined && object.startTime !== null
        ? Timestamp.fromPartial(object.startTime)
        : undefined;
    message.endTime =
      object.endTime !== undefined && object.endTime !== null
        ? Timestamp.fromPartial(object.endTime)
        : undefined;
    return message;
  },
  fromProtoMsg(message: ArithmeticTwapRequestProtoMsg): ArithmeticTwapRequest {
    return ArithmeticTwapRequest.decode(message.value);
  },
  toProto(message: ArithmeticTwapRequest): Uint8Array {
    return ArithmeticTwapRequest.encode(message).finish();
  },
  toProtoMsg(message: ArithmeticTwapRequest): ArithmeticTwapRequestProtoMsg {
    return {
      typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapRequest',
      value: ArithmeticTwapRequest.encode(message).finish(),
    };
  },
};
function createBaseArithmeticTwapResponse(): ArithmeticTwapResponse {
  return {
    arithmeticTwap: '',
  };
}
export const ArithmeticTwapResponse = {
  typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapResponse',
  encode(
    message: ArithmeticTwapResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.arithmeticTwap !== '') {
      writer
        .uint32(10)
        .string(Decimal.fromUserInput(message.arithmeticTwap, 18).atomics);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ArithmeticTwapResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseArithmeticTwapResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.arithmeticTwap = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ArithmeticTwapResponse {
    return {
      arithmeticTwap: isSet(object.arithmeticTwap)
        ? String(object.arithmeticTwap)
        : '',
    };
  },
  toJSON(message: ArithmeticTwapResponse): JsonSafe<ArithmeticTwapResponse> {
    const obj: any = {};
    message.arithmeticTwap !== undefined &&
      (obj.arithmeticTwap = message.arithmeticTwap);
    return obj;
  },
  fromPartial(object: Partial<ArithmeticTwapResponse>): ArithmeticTwapResponse {
    const message = createBaseArithmeticTwapResponse();
    message.arithmeticTwap = object.arithmeticTwap ?? '';
    return message;
  },
  fromProtoMsg(
    message: ArithmeticTwapResponseProtoMsg,
  ): ArithmeticTwapResponse {
    return ArithmeticTwapResponse.decode(message.value);
  },
  toProto(message: ArithmeticTwapResponse): Uint8Array {
    return ArithmeticTwapResponse.encode(message).finish();
  },
  toProtoMsg(message: ArithmeticTwapResponse): ArithmeticTwapResponseProtoMsg {
    return {
      typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapResponse',
      value: ArithmeticTwapResponse.encode(message).finish(),
    };
  },
};
function createBaseArithmeticTwapToNowRequest(): ArithmeticTwapToNowRequest {
  return {
    poolId: BigInt(0),
    baseAsset: '',
    quoteAsset: '',
    startTime: Timestamp.fromPartial({}),
  };
}
export const ArithmeticTwapToNowRequest = {
  typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapToNowRequest',
  encode(
    message: ArithmeticTwapToNowRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.baseAsset !== '') {
      writer.uint32(18).string(message.baseAsset);
    }
    if (message.quoteAsset !== '') {
      writer.uint32(26).string(message.quoteAsset);
    }
    if (message.startTime !== undefined) {
      Timestamp.encode(message.startTime, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ArithmeticTwapToNowRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseArithmeticTwapToNowRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.baseAsset = reader.string();
          break;
        case 3:
          message.quoteAsset = reader.string();
          break;
        case 4:
          message.startTime = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ArithmeticTwapToNowRequest {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      baseAsset: isSet(object.baseAsset) ? String(object.baseAsset) : '',
      quoteAsset: isSet(object.quoteAsset) ? String(object.quoteAsset) : '',
      startTime: isSet(object.startTime)
        ? fromJsonTimestamp(object.startTime)
        : undefined,
    };
  },
  toJSON(
    message: ArithmeticTwapToNowRequest,
  ): JsonSafe<ArithmeticTwapToNowRequest> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.baseAsset !== undefined && (obj.baseAsset = message.baseAsset);
    message.quoteAsset !== undefined && (obj.quoteAsset = message.quoteAsset);
    message.startTime !== undefined &&
      (obj.startTime = fromTimestamp(message.startTime).toISOString());
    return obj;
  },
  fromPartial(
    object: Partial<ArithmeticTwapToNowRequest>,
  ): ArithmeticTwapToNowRequest {
    const message = createBaseArithmeticTwapToNowRequest();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.baseAsset = object.baseAsset ?? '';
    message.quoteAsset = object.quoteAsset ?? '';
    message.startTime =
      object.startTime !== undefined && object.startTime !== null
        ? Timestamp.fromPartial(object.startTime)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: ArithmeticTwapToNowRequestProtoMsg,
  ): ArithmeticTwapToNowRequest {
    return ArithmeticTwapToNowRequest.decode(message.value);
  },
  toProto(message: ArithmeticTwapToNowRequest): Uint8Array {
    return ArithmeticTwapToNowRequest.encode(message).finish();
  },
  toProtoMsg(
    message: ArithmeticTwapToNowRequest,
  ): ArithmeticTwapToNowRequestProtoMsg {
    return {
      typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapToNowRequest',
      value: ArithmeticTwapToNowRequest.encode(message).finish(),
    };
  },
};
function createBaseArithmeticTwapToNowResponse(): ArithmeticTwapToNowResponse {
  return {
    arithmeticTwap: '',
  };
}
export const ArithmeticTwapToNowResponse = {
  typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapToNowResponse',
  encode(
    message: ArithmeticTwapToNowResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.arithmeticTwap !== '') {
      writer
        .uint32(10)
        .string(Decimal.fromUserInput(message.arithmeticTwap, 18).atomics);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ArithmeticTwapToNowResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseArithmeticTwapToNowResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.arithmeticTwap = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ArithmeticTwapToNowResponse {
    return {
      arithmeticTwap: isSet(object.arithmeticTwap)
        ? String(object.arithmeticTwap)
        : '',
    };
  },
  toJSON(
    message: ArithmeticTwapToNowResponse,
  ): JsonSafe<ArithmeticTwapToNowResponse> {
    const obj: any = {};
    message.arithmeticTwap !== undefined &&
      (obj.arithmeticTwap = message.arithmeticTwap);
    return obj;
  },
  fromPartial(
    object: Partial<ArithmeticTwapToNowResponse>,
  ): ArithmeticTwapToNowResponse {
    const message = createBaseArithmeticTwapToNowResponse();
    message.arithmeticTwap = object.arithmeticTwap ?? '';
    return message;
  },
  fromProtoMsg(
    message: ArithmeticTwapToNowResponseProtoMsg,
  ): ArithmeticTwapToNowResponse {
    return ArithmeticTwapToNowResponse.decode(message.value);
  },
  toProto(message: ArithmeticTwapToNowResponse): Uint8Array {
    return ArithmeticTwapToNowResponse.encode(message).finish();
  },
  toProtoMsg(
    message: ArithmeticTwapToNowResponse,
  ): ArithmeticTwapToNowResponseProtoMsg {
    return {
      typeUrl: '/osmosis.twap.v1beta1.ArithmeticTwapToNowResponse',
      value: ArithmeticTwapToNowResponse.encode(message).finish(),
    };
  },
};
function createBaseParamsRequest(): ParamsRequest {
  return {};
}
export const ParamsRequest = {
  typeUrl: '/osmosis.twap.v1beta1.ParamsRequest',
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
      typeUrl: '/osmosis.twap.v1beta1.ParamsRequest',
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
  typeUrl: '/osmosis.twap.v1beta1.ParamsResponse',
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
      typeUrl: '/osmosis.twap.v1beta1.ParamsResponse',
      value: ParamsResponse.encode(message).finish(),
    };
  },
};
