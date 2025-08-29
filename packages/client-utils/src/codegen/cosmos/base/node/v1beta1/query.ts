//@ts-nocheck
import {
  Timestamp,
  type TimestampSDKType,
} from '../../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
import {
  isSet,
  fromJsonTimestamp,
  fromTimestamp,
} from '../../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/** ConfigRequest defines the request structure for the Config gRPC query. */
export interface ConfigRequest {}
export interface ConfigRequestProtoMsg {
  typeUrl: '/cosmos.base.node.v1beta1.ConfigRequest';
  value: Uint8Array;
}
/** ConfigRequest defines the request structure for the Config gRPC query. */
export interface ConfigRequestSDKType {}
/** ConfigResponse defines the response structure for the Config gRPC query. */
export interface ConfigResponse {
  minimumGasPrice: string;
  pruningKeepRecent: string;
  pruningInterval: string;
  haltHeight: bigint;
}
export interface ConfigResponseProtoMsg {
  typeUrl: '/cosmos.base.node.v1beta1.ConfigResponse';
  value: Uint8Array;
}
/** ConfigResponse defines the response structure for the Config gRPC query. */
export interface ConfigResponseSDKType {
  minimum_gas_price: string;
  pruning_keep_recent: string;
  pruning_interval: string;
  halt_height: bigint;
}
/** StateRequest defines the request structure for the status of a node. */
export interface StatusRequest {}
export interface StatusRequestProtoMsg {
  typeUrl: '/cosmos.base.node.v1beta1.StatusRequest';
  value: Uint8Array;
}
/** StateRequest defines the request structure for the status of a node. */
export interface StatusRequestSDKType {}
/** StateResponse defines the response structure for the status of a node. */
export interface StatusResponse {
  /** earliest block height available in the store */
  earliestStoreHeight: bigint;
  /** current block height */
  height: bigint;
  /** block height timestamp */
  timestamp?: Timestamp;
  /** app hash of the current block */
  appHash: Uint8Array;
  /** validator hash provided by the consensus header */
  validatorHash: Uint8Array;
}
export interface StatusResponseProtoMsg {
  typeUrl: '/cosmos.base.node.v1beta1.StatusResponse';
  value: Uint8Array;
}
/** StateResponse defines the response structure for the status of a node. */
export interface StatusResponseSDKType {
  earliest_store_height: bigint;
  height: bigint;
  timestamp?: TimestampSDKType;
  app_hash: Uint8Array;
  validator_hash: Uint8Array;
}
function createBaseConfigRequest(): ConfigRequest {
  return {};
}
export const ConfigRequest = {
  typeUrl: '/cosmos.base.node.v1beta1.ConfigRequest',
  encode(
    _: ConfigRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ConfigRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConfigRequest();
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
  fromJSON(_: any): ConfigRequest {
    return {};
  },
  toJSON(_: ConfigRequest): JsonSafe<ConfigRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<ConfigRequest>): ConfigRequest {
    const message = createBaseConfigRequest();
    return message;
  },
  fromProtoMsg(message: ConfigRequestProtoMsg): ConfigRequest {
    return ConfigRequest.decode(message.value);
  },
  toProto(message: ConfigRequest): Uint8Array {
    return ConfigRequest.encode(message).finish();
  },
  toProtoMsg(message: ConfigRequest): ConfigRequestProtoMsg {
    return {
      typeUrl: '/cosmos.base.node.v1beta1.ConfigRequest',
      value: ConfigRequest.encode(message).finish(),
    };
  },
};
function createBaseConfigResponse(): ConfigResponse {
  return {
    minimumGasPrice: '',
    pruningKeepRecent: '',
    pruningInterval: '',
    haltHeight: BigInt(0),
  };
}
export const ConfigResponse = {
  typeUrl: '/cosmos.base.node.v1beta1.ConfigResponse',
  encode(
    message: ConfigResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.minimumGasPrice !== '') {
      writer.uint32(10).string(message.minimumGasPrice);
    }
    if (message.pruningKeepRecent !== '') {
      writer.uint32(18).string(message.pruningKeepRecent);
    }
    if (message.pruningInterval !== '') {
      writer.uint32(26).string(message.pruningInterval);
    }
    if (message.haltHeight !== BigInt(0)) {
      writer.uint32(32).uint64(message.haltHeight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ConfigResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConfigResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.minimumGasPrice = reader.string();
          break;
        case 2:
          message.pruningKeepRecent = reader.string();
          break;
        case 3:
          message.pruningInterval = reader.string();
          break;
        case 4:
          message.haltHeight = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ConfigResponse {
    return {
      minimumGasPrice: isSet(object.minimumGasPrice)
        ? String(object.minimumGasPrice)
        : '',
      pruningKeepRecent: isSet(object.pruningKeepRecent)
        ? String(object.pruningKeepRecent)
        : '',
      pruningInterval: isSet(object.pruningInterval)
        ? String(object.pruningInterval)
        : '',
      haltHeight: isSet(object.haltHeight)
        ? BigInt(object.haltHeight.toString())
        : BigInt(0),
    };
  },
  toJSON(message: ConfigResponse): JsonSafe<ConfigResponse> {
    const obj: any = {};
    message.minimumGasPrice !== undefined &&
      (obj.minimumGasPrice = message.minimumGasPrice);
    message.pruningKeepRecent !== undefined &&
      (obj.pruningKeepRecent = message.pruningKeepRecent);
    message.pruningInterval !== undefined &&
      (obj.pruningInterval = message.pruningInterval);
    message.haltHeight !== undefined &&
      (obj.haltHeight = (message.haltHeight || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<ConfigResponse>): ConfigResponse {
    const message = createBaseConfigResponse();
    message.minimumGasPrice = object.minimumGasPrice ?? '';
    message.pruningKeepRecent = object.pruningKeepRecent ?? '';
    message.pruningInterval = object.pruningInterval ?? '';
    message.haltHeight =
      object.haltHeight !== undefined && object.haltHeight !== null
        ? BigInt(object.haltHeight.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: ConfigResponseProtoMsg): ConfigResponse {
    return ConfigResponse.decode(message.value);
  },
  toProto(message: ConfigResponse): Uint8Array {
    return ConfigResponse.encode(message).finish();
  },
  toProtoMsg(message: ConfigResponse): ConfigResponseProtoMsg {
    return {
      typeUrl: '/cosmos.base.node.v1beta1.ConfigResponse',
      value: ConfigResponse.encode(message).finish(),
    };
  },
};
function createBaseStatusRequest(): StatusRequest {
  return {};
}
export const StatusRequest = {
  typeUrl: '/cosmos.base.node.v1beta1.StatusRequest',
  encode(
    _: StatusRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): StatusRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStatusRequest();
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
  fromJSON(_: any): StatusRequest {
    return {};
  },
  toJSON(_: StatusRequest): JsonSafe<StatusRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<StatusRequest>): StatusRequest {
    const message = createBaseStatusRequest();
    return message;
  },
  fromProtoMsg(message: StatusRequestProtoMsg): StatusRequest {
    return StatusRequest.decode(message.value);
  },
  toProto(message: StatusRequest): Uint8Array {
    return StatusRequest.encode(message).finish();
  },
  toProtoMsg(message: StatusRequest): StatusRequestProtoMsg {
    return {
      typeUrl: '/cosmos.base.node.v1beta1.StatusRequest',
      value: StatusRequest.encode(message).finish(),
    };
  },
};
function createBaseStatusResponse(): StatusResponse {
  return {
    earliestStoreHeight: BigInt(0),
    height: BigInt(0),
    timestamp: undefined,
    appHash: new Uint8Array(),
    validatorHash: new Uint8Array(),
  };
}
export const StatusResponse = {
  typeUrl: '/cosmos.base.node.v1beta1.StatusResponse',
  encode(
    message: StatusResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.earliestStoreHeight !== BigInt(0)) {
      writer.uint32(8).uint64(message.earliestStoreHeight);
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(16).uint64(message.height);
    }
    if (message.timestamp !== undefined) {
      Timestamp.encode(message.timestamp, writer.uint32(26).fork()).ldelim();
    }
    if (message.appHash.length !== 0) {
      writer.uint32(34).bytes(message.appHash);
    }
    if (message.validatorHash.length !== 0) {
      writer.uint32(42).bytes(message.validatorHash);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): StatusResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStatusResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.earliestStoreHeight = reader.uint64();
          break;
        case 2:
          message.height = reader.uint64();
          break;
        case 3:
          message.timestamp = Timestamp.decode(reader, reader.uint32());
          break;
        case 4:
          message.appHash = reader.bytes();
          break;
        case 5:
          message.validatorHash = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): StatusResponse {
    return {
      earliestStoreHeight: isSet(object.earliestStoreHeight)
        ? BigInt(object.earliestStoreHeight.toString())
        : BigInt(0),
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      timestamp: isSet(object.timestamp)
        ? fromJsonTimestamp(object.timestamp)
        : undefined,
      appHash: isSet(object.appHash)
        ? bytesFromBase64(object.appHash)
        : new Uint8Array(),
      validatorHash: isSet(object.validatorHash)
        ? bytesFromBase64(object.validatorHash)
        : new Uint8Array(),
    };
  },
  toJSON(message: StatusResponse): JsonSafe<StatusResponse> {
    const obj: any = {};
    message.earliestStoreHeight !== undefined &&
      (obj.earliestStoreHeight = (
        message.earliestStoreHeight || BigInt(0)
      ).toString());
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.timestamp !== undefined &&
      (obj.timestamp = fromTimestamp(message.timestamp).toISOString());
    message.appHash !== undefined &&
      (obj.appHash = base64FromBytes(
        message.appHash !== undefined ? message.appHash : new Uint8Array(),
      ));
    message.validatorHash !== undefined &&
      (obj.validatorHash = base64FromBytes(
        message.validatorHash !== undefined
          ? message.validatorHash
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<StatusResponse>): StatusResponse {
    const message = createBaseStatusResponse();
    message.earliestStoreHeight =
      object.earliestStoreHeight !== undefined &&
      object.earliestStoreHeight !== null
        ? BigInt(object.earliestStoreHeight.toString())
        : BigInt(0);
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.timestamp =
      object.timestamp !== undefined && object.timestamp !== null
        ? Timestamp.fromPartial(object.timestamp)
        : undefined;
    message.appHash = object.appHash ?? new Uint8Array();
    message.validatorHash = object.validatorHash ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: StatusResponseProtoMsg): StatusResponse {
    return StatusResponse.decode(message.value);
  },
  toProto(message: StatusResponse): Uint8Array {
    return StatusResponse.encode(message).finish();
  },
  toProtoMsg(message: StatusResponse): StatusResponseProtoMsg {
    return {
      typeUrl: '/cosmos.base.node.v1beta1.StatusResponse',
      value: StatusResponse.encode(message).finish(),
    };
  },
};
