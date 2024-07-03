//@ts-nocheck
import { EpochInfo, EpochInfoSDKType } from './genesis.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { JsonSafe } from '../../json-safe.js';
import { isSet } from '../../helpers.js';
export interface QueryEpochsInfoRequest {}
export interface QueryEpochsInfoRequestProtoMsg {
  typeUrl: '/osmosis.epochs.v1beta1.QueryEpochsInfoRequest';
  value: Uint8Array;
}
export interface QueryEpochsInfoRequestSDKType {}
export interface QueryEpochsInfoResponse {
  epochs: EpochInfo[];
}
export interface QueryEpochsInfoResponseProtoMsg {
  typeUrl: '/osmosis.epochs.v1beta1.QueryEpochsInfoResponse';
  value: Uint8Array;
}
export interface QueryEpochsInfoResponseSDKType {
  epochs: EpochInfoSDKType[];
}
export interface QueryCurrentEpochRequest {
  identifier: string;
}
export interface QueryCurrentEpochRequestProtoMsg {
  typeUrl: '/osmosis.epochs.v1beta1.QueryCurrentEpochRequest';
  value: Uint8Array;
}
export interface QueryCurrentEpochRequestSDKType {
  identifier: string;
}
export interface QueryCurrentEpochResponse {
  currentEpoch: bigint;
}
export interface QueryCurrentEpochResponseProtoMsg {
  typeUrl: '/osmosis.epochs.v1beta1.QueryCurrentEpochResponse';
  value: Uint8Array;
}
export interface QueryCurrentEpochResponseSDKType {
  current_epoch: bigint;
}
function createBaseQueryEpochsInfoRequest(): QueryEpochsInfoRequest {
  return {};
}
export const QueryEpochsInfoRequest = {
  typeUrl: '/osmosis.epochs.v1beta1.QueryEpochsInfoRequest',
  encode(
    _: QueryEpochsInfoRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryEpochsInfoRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryEpochsInfoRequest();
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
  fromJSON(_: any): QueryEpochsInfoRequest {
    return {};
  },
  toJSON(_: QueryEpochsInfoRequest): JsonSafe<QueryEpochsInfoRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryEpochsInfoRequest>): QueryEpochsInfoRequest {
    const message = createBaseQueryEpochsInfoRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryEpochsInfoRequestProtoMsg,
  ): QueryEpochsInfoRequest {
    return QueryEpochsInfoRequest.decode(message.value);
  },
  toProto(message: QueryEpochsInfoRequest): Uint8Array {
    return QueryEpochsInfoRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryEpochsInfoRequest): QueryEpochsInfoRequestProtoMsg {
    return {
      typeUrl: '/osmosis.epochs.v1beta1.QueryEpochsInfoRequest',
      value: QueryEpochsInfoRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryEpochsInfoResponse(): QueryEpochsInfoResponse {
  return {
    epochs: [],
  };
}
export const QueryEpochsInfoResponse = {
  typeUrl: '/osmosis.epochs.v1beta1.QueryEpochsInfoResponse',
  encode(
    message: QueryEpochsInfoResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.epochs) {
      EpochInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryEpochsInfoResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryEpochsInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.epochs.push(EpochInfo.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryEpochsInfoResponse {
    return {
      epochs: Array.isArray(object?.epochs)
        ? object.epochs.map((e: any) => EpochInfo.fromJSON(e))
        : [],
    };
  },
  toJSON(message: QueryEpochsInfoResponse): JsonSafe<QueryEpochsInfoResponse> {
    const obj: any = {};
    if (message.epochs) {
      obj.epochs = message.epochs.map(e =>
        e ? EpochInfo.toJSON(e) : undefined,
      );
    } else {
      obj.epochs = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryEpochsInfoResponse>,
  ): QueryEpochsInfoResponse {
    const message = createBaseQueryEpochsInfoResponse();
    message.epochs = object.epochs?.map(e => EpochInfo.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryEpochsInfoResponseProtoMsg,
  ): QueryEpochsInfoResponse {
    return QueryEpochsInfoResponse.decode(message.value);
  },
  toProto(message: QueryEpochsInfoResponse): Uint8Array {
    return QueryEpochsInfoResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryEpochsInfoResponse,
  ): QueryEpochsInfoResponseProtoMsg {
    return {
      typeUrl: '/osmosis.epochs.v1beta1.QueryEpochsInfoResponse',
      value: QueryEpochsInfoResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryCurrentEpochRequest(): QueryCurrentEpochRequest {
  return {
    identifier: '',
  };
}
export const QueryCurrentEpochRequest = {
  typeUrl: '/osmosis.epochs.v1beta1.QueryCurrentEpochRequest',
  encode(
    message: QueryCurrentEpochRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.identifier !== '') {
      writer.uint32(10).string(message.identifier);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCurrentEpochRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCurrentEpochRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.identifier = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCurrentEpochRequest {
    return {
      identifier: isSet(object.identifier) ? String(object.identifier) : '',
    };
  },
  toJSON(
    message: QueryCurrentEpochRequest,
  ): JsonSafe<QueryCurrentEpochRequest> {
    const obj: any = {};
    message.identifier !== undefined && (obj.identifier = message.identifier);
    return obj;
  },
  fromPartial(
    object: Partial<QueryCurrentEpochRequest>,
  ): QueryCurrentEpochRequest {
    const message = createBaseQueryCurrentEpochRequest();
    message.identifier = object.identifier ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryCurrentEpochRequestProtoMsg,
  ): QueryCurrentEpochRequest {
    return QueryCurrentEpochRequest.decode(message.value);
  },
  toProto(message: QueryCurrentEpochRequest): Uint8Array {
    return QueryCurrentEpochRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCurrentEpochRequest,
  ): QueryCurrentEpochRequestProtoMsg {
    return {
      typeUrl: '/osmosis.epochs.v1beta1.QueryCurrentEpochRequest',
      value: QueryCurrentEpochRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryCurrentEpochResponse(): QueryCurrentEpochResponse {
  return {
    currentEpoch: BigInt(0),
  };
}
export const QueryCurrentEpochResponse = {
  typeUrl: '/osmosis.epochs.v1beta1.QueryCurrentEpochResponse',
  encode(
    message: QueryCurrentEpochResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.currentEpoch !== BigInt(0)) {
      writer.uint32(8).int64(message.currentEpoch);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCurrentEpochResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCurrentEpochResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.currentEpoch = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCurrentEpochResponse {
    return {
      currentEpoch: isSet(object.currentEpoch)
        ? BigInt(object.currentEpoch.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryCurrentEpochResponse,
  ): JsonSafe<QueryCurrentEpochResponse> {
    const obj: any = {};
    message.currentEpoch !== undefined &&
      (obj.currentEpoch = (message.currentEpoch || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryCurrentEpochResponse>,
  ): QueryCurrentEpochResponse {
    const message = createBaseQueryCurrentEpochResponse();
    message.currentEpoch =
      object.currentEpoch !== undefined && object.currentEpoch !== null
        ? BigInt(object.currentEpoch.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryCurrentEpochResponseProtoMsg,
  ): QueryCurrentEpochResponse {
    return QueryCurrentEpochResponse.decode(message.value);
  },
  toProto(message: QueryCurrentEpochResponse): Uint8Array {
    return QueryCurrentEpochResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCurrentEpochResponse,
  ): QueryCurrentEpochResponseProtoMsg {
    return {
      typeUrl: '/osmosis.epochs.v1beta1.QueryCurrentEpochResponse',
      value: QueryCurrentEpochResponse.encode(message).finish(),
    };
  },
};
