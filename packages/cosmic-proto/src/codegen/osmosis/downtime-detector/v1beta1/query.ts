//@ts-nocheck
import {
  Downtime,
  downtimeFromJSON,
  downtimeToJSON,
} from './downtime_duration.js';
import {
  Duration,
  DurationSDKType,
} from '../../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/**
 * Query for has it been at least $RECOVERY_DURATION units of time,
 * since the chain has been down for $DOWNTIME_DURATION.
 */
export interface RecoveredSinceDowntimeOfLengthRequest {
  downtime: Downtime;
  recovery: Duration;
}
export interface RecoveredSinceDowntimeOfLengthRequestProtoMsg {
  typeUrl: '/osmosis.downtimedetector.v1beta1.RecoveredSinceDowntimeOfLengthRequest';
  value: Uint8Array;
}
/**
 * Query for has it been at least $RECOVERY_DURATION units of time,
 * since the chain has been down for $DOWNTIME_DURATION.
 */
export interface RecoveredSinceDowntimeOfLengthRequestSDKType {
  downtime: Downtime;
  recovery: DurationSDKType;
}
export interface RecoveredSinceDowntimeOfLengthResponse {
  succesfullyRecovered: boolean;
}
export interface RecoveredSinceDowntimeOfLengthResponseProtoMsg {
  typeUrl: '/osmosis.downtimedetector.v1beta1.RecoveredSinceDowntimeOfLengthResponse';
  value: Uint8Array;
}
export interface RecoveredSinceDowntimeOfLengthResponseSDKType {
  succesfully_recovered: boolean;
}
function createBaseRecoveredSinceDowntimeOfLengthRequest(): RecoveredSinceDowntimeOfLengthRequest {
  return {
    downtime: 0,
    recovery: Duration.fromPartial({}),
  };
}
export const RecoveredSinceDowntimeOfLengthRequest = {
  typeUrl:
    '/osmosis.downtimedetector.v1beta1.RecoveredSinceDowntimeOfLengthRequest',
  encode(
    message: RecoveredSinceDowntimeOfLengthRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.downtime !== 0) {
      writer.uint32(8).int32(message.downtime);
    }
    if (message.recovery !== undefined) {
      Duration.encode(message.recovery, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RecoveredSinceDowntimeOfLengthRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRecoveredSinceDowntimeOfLengthRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.downtime = reader.int32() as any;
          break;
        case 2:
          message.recovery = Duration.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RecoveredSinceDowntimeOfLengthRequest {
    return {
      downtime: isSet(object.downtime) ? downtimeFromJSON(object.downtime) : -1,
      recovery: isSet(object.recovery)
        ? Duration.fromJSON(object.recovery)
        : undefined,
    };
  },
  toJSON(
    message: RecoveredSinceDowntimeOfLengthRequest,
  ): JsonSafe<RecoveredSinceDowntimeOfLengthRequest> {
    const obj: any = {};
    message.downtime !== undefined &&
      (obj.downtime = downtimeToJSON(message.downtime));
    message.recovery !== undefined &&
      (obj.recovery = message.recovery
        ? Duration.toJSON(message.recovery)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<RecoveredSinceDowntimeOfLengthRequest>,
  ): RecoveredSinceDowntimeOfLengthRequest {
    const message = createBaseRecoveredSinceDowntimeOfLengthRequest();
    message.downtime = object.downtime ?? 0;
    message.recovery =
      object.recovery !== undefined && object.recovery !== null
        ? Duration.fromPartial(object.recovery)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: RecoveredSinceDowntimeOfLengthRequestProtoMsg,
  ): RecoveredSinceDowntimeOfLengthRequest {
    return RecoveredSinceDowntimeOfLengthRequest.decode(message.value);
  },
  toProto(message: RecoveredSinceDowntimeOfLengthRequest): Uint8Array {
    return RecoveredSinceDowntimeOfLengthRequest.encode(message).finish();
  },
  toProtoMsg(
    message: RecoveredSinceDowntimeOfLengthRequest,
  ): RecoveredSinceDowntimeOfLengthRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.downtimedetector.v1beta1.RecoveredSinceDowntimeOfLengthRequest',
      value: RecoveredSinceDowntimeOfLengthRequest.encode(message).finish(),
    };
  },
};
function createBaseRecoveredSinceDowntimeOfLengthResponse(): RecoveredSinceDowntimeOfLengthResponse {
  return {
    succesfullyRecovered: false,
  };
}
export const RecoveredSinceDowntimeOfLengthResponse = {
  typeUrl:
    '/osmosis.downtimedetector.v1beta1.RecoveredSinceDowntimeOfLengthResponse',
  encode(
    message: RecoveredSinceDowntimeOfLengthResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.succesfullyRecovered === true) {
      writer.uint32(8).bool(message.succesfullyRecovered);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RecoveredSinceDowntimeOfLengthResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRecoveredSinceDowntimeOfLengthResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.succesfullyRecovered = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RecoveredSinceDowntimeOfLengthResponse {
    return {
      succesfullyRecovered: isSet(object.succesfullyRecovered)
        ? Boolean(object.succesfullyRecovered)
        : false,
    };
  },
  toJSON(
    message: RecoveredSinceDowntimeOfLengthResponse,
  ): JsonSafe<RecoveredSinceDowntimeOfLengthResponse> {
    const obj: any = {};
    message.succesfullyRecovered !== undefined &&
      (obj.succesfullyRecovered = message.succesfullyRecovered);
    return obj;
  },
  fromPartial(
    object: Partial<RecoveredSinceDowntimeOfLengthResponse>,
  ): RecoveredSinceDowntimeOfLengthResponse {
    const message = createBaseRecoveredSinceDowntimeOfLengthResponse();
    message.succesfullyRecovered = object.succesfullyRecovered ?? false;
    return message;
  },
  fromProtoMsg(
    message: RecoveredSinceDowntimeOfLengthResponseProtoMsg,
  ): RecoveredSinceDowntimeOfLengthResponse {
    return RecoveredSinceDowntimeOfLengthResponse.decode(message.value);
  },
  toProto(message: RecoveredSinceDowntimeOfLengthResponse): Uint8Array {
    return RecoveredSinceDowntimeOfLengthResponse.encode(message).finish();
  },
  toProtoMsg(
    message: RecoveredSinceDowntimeOfLengthResponse,
  ): RecoveredSinceDowntimeOfLengthResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.downtimedetector.v1beta1.RecoveredSinceDowntimeOfLengthResponse',
      value: RecoveredSinceDowntimeOfLengthResponse.encode(message).finish(),
    };
  },
};
