//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * EventEpochEnd is an event emitted when an epoch end.
 * @name EventEpochEnd
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.EventEpochEnd
 */
export interface EventEpochEnd {
  epochNumber: bigint;
}
export interface EventEpochEndProtoMsg {
  typeUrl: '/cosmos.epochs.v1beta1.EventEpochEnd';
  value: Uint8Array;
}
/**
 * EventEpochEnd is an event emitted when an epoch end.
 * @name EventEpochEndSDKType
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.EventEpochEnd
 */
export interface EventEpochEndSDKType {
  epoch_number: bigint;
}
/**
 * EventEpochStart is an event emitted when an epoch start.
 * @name EventEpochStart
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.EventEpochStart
 */
export interface EventEpochStart {
  epochNumber: bigint;
  epochStartTime: bigint;
}
export interface EventEpochStartProtoMsg {
  typeUrl: '/cosmos.epochs.v1beta1.EventEpochStart';
  value: Uint8Array;
}
/**
 * EventEpochStart is an event emitted when an epoch start.
 * @name EventEpochStartSDKType
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.EventEpochStart
 */
export interface EventEpochStartSDKType {
  epoch_number: bigint;
  epoch_start_time: bigint;
}
function createBaseEventEpochEnd(): EventEpochEnd {
  return {
    epochNumber: BigInt(0),
  };
}
/**
 * EventEpochEnd is an event emitted when an epoch end.
 * @name EventEpochEnd
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.EventEpochEnd
 */
export const EventEpochEnd = {
  typeUrl: '/cosmos.epochs.v1beta1.EventEpochEnd' as const,
  aminoType: 'cosmos-sdk/EventEpochEnd' as const,
  is(o: any): o is EventEpochEnd {
    return (
      o &&
      (o.$typeUrl === EventEpochEnd.typeUrl ||
        typeof o.epochNumber === 'bigint')
    );
  },
  isSDK(o: any): o is EventEpochEndSDKType {
    return (
      o &&
      (o.$typeUrl === EventEpochEnd.typeUrl ||
        typeof o.epoch_number === 'bigint')
    );
  },
  encode(
    message: EventEpochEnd,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.epochNumber !== BigInt(0)) {
      writer.uint32(8).int64(message.epochNumber);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventEpochEnd {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventEpochEnd();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.epochNumber = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventEpochEnd {
    return {
      epochNumber: isSet(object.epochNumber)
        ? BigInt(object.epochNumber.toString())
        : BigInt(0),
    };
  },
  toJSON(message: EventEpochEnd): JsonSafe<EventEpochEnd> {
    const obj: any = {};
    message.epochNumber !== undefined &&
      (obj.epochNumber = (message.epochNumber || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<EventEpochEnd>): EventEpochEnd {
    const message = createBaseEventEpochEnd();
    message.epochNumber =
      object.epochNumber !== undefined && object.epochNumber !== null
        ? BigInt(object.epochNumber.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: EventEpochEndProtoMsg): EventEpochEnd {
    return EventEpochEnd.decode(message.value);
  },
  toProto(message: EventEpochEnd): Uint8Array {
    return EventEpochEnd.encode(message).finish();
  },
  toProtoMsg(message: EventEpochEnd): EventEpochEndProtoMsg {
    return {
      typeUrl: '/cosmos.epochs.v1beta1.EventEpochEnd',
      value: EventEpochEnd.encode(message).finish(),
    };
  },
};
function createBaseEventEpochStart(): EventEpochStart {
  return {
    epochNumber: BigInt(0),
    epochStartTime: BigInt(0),
  };
}
/**
 * EventEpochStart is an event emitted when an epoch start.
 * @name EventEpochStart
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.EventEpochStart
 */
export const EventEpochStart = {
  typeUrl: '/cosmos.epochs.v1beta1.EventEpochStart' as const,
  aminoType: 'cosmos-sdk/EventEpochStart' as const,
  is(o: any): o is EventEpochStart {
    return (
      o &&
      (o.$typeUrl === EventEpochStart.typeUrl ||
        (typeof o.epochNumber === 'bigint' &&
          typeof o.epochStartTime === 'bigint'))
    );
  },
  isSDK(o: any): o is EventEpochStartSDKType {
    return (
      o &&
      (o.$typeUrl === EventEpochStart.typeUrl ||
        (typeof o.epoch_number === 'bigint' &&
          typeof o.epoch_start_time === 'bigint'))
    );
  },
  encode(
    message: EventEpochStart,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.epochNumber !== BigInt(0)) {
      writer.uint32(8).int64(message.epochNumber);
    }
    if (message.epochStartTime !== BigInt(0)) {
      writer.uint32(16).int64(message.epochStartTime);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventEpochStart {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventEpochStart();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.epochNumber = reader.int64();
          break;
        case 2:
          message.epochStartTime = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventEpochStart {
    return {
      epochNumber: isSet(object.epochNumber)
        ? BigInt(object.epochNumber.toString())
        : BigInt(0),
      epochStartTime: isSet(object.epochStartTime)
        ? BigInt(object.epochStartTime.toString())
        : BigInt(0),
    };
  },
  toJSON(message: EventEpochStart): JsonSafe<EventEpochStart> {
    const obj: any = {};
    message.epochNumber !== undefined &&
      (obj.epochNumber = (message.epochNumber || BigInt(0)).toString());
    message.epochStartTime !== undefined &&
      (obj.epochStartTime = (message.epochStartTime || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<EventEpochStart>): EventEpochStart {
    const message = createBaseEventEpochStart();
    message.epochNumber =
      object.epochNumber !== undefined && object.epochNumber !== null
        ? BigInt(object.epochNumber.toString())
        : BigInt(0);
    message.epochStartTime =
      object.epochStartTime !== undefined && object.epochStartTime !== null
        ? BigInt(object.epochStartTime.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: EventEpochStartProtoMsg): EventEpochStart {
    return EventEpochStart.decode(message.value);
  },
  toProto(message: EventEpochStart): Uint8Array {
    return EventEpochStart.encode(message).finish();
  },
  toProtoMsg(message: EventEpochStart): EventEpochStartProtoMsg {
    return {
      typeUrl: '/cosmos.epochs.v1beta1.EventEpochStart',
      value: EventEpochStart.encode(message).finish(),
    };
  },
};
