//@ts-nocheck
import {
  Timeout,
  type TimeoutSDKType,
  Order,
  orderFromJSON,
  orderToJSON,
} from './channel.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Upgrade is a verifiable type which contains the relevant information
 * for an attempted upgrade. It provides the proposed changes to the channel
 * end, the timeout for this upgrade attempt and the next packet sequence
 * which allows the counterparty to efficiently know the highest sequence it has received.
 * The next sequence send is used for pruning and upgrading from unordered to ordered channels.
 */
export interface Upgrade {
  fields: UpgradeFields;
  timeout: Timeout;
  nextSequenceSend: bigint;
}
export interface UpgradeProtoMsg {
  typeUrl: '/ibc.core.channel.v1.Upgrade';
  value: Uint8Array;
}
/**
 * Upgrade is a verifiable type which contains the relevant information
 * for an attempted upgrade. It provides the proposed changes to the channel
 * end, the timeout for this upgrade attempt and the next packet sequence
 * which allows the counterparty to efficiently know the highest sequence it has received.
 * The next sequence send is used for pruning and upgrading from unordered to ordered channels.
 */
export interface UpgradeSDKType {
  fields: UpgradeFieldsSDKType;
  timeout: TimeoutSDKType;
  next_sequence_send: bigint;
}
/**
 * UpgradeFields are the fields in a channel end which may be changed
 * during a channel upgrade.
 */
export interface UpgradeFields {
  ordering: Order;
  connectionHops: string[];
  version: string;
}
export interface UpgradeFieldsProtoMsg {
  typeUrl: '/ibc.core.channel.v1.UpgradeFields';
  value: Uint8Array;
}
/**
 * UpgradeFields are the fields in a channel end which may be changed
 * during a channel upgrade.
 */
export interface UpgradeFieldsSDKType {
  ordering: Order;
  connection_hops: string[];
  version: string;
}
/**
 * ErrorReceipt defines a type which encapsulates the upgrade sequence and error associated with the
 * upgrade handshake failure. When a channel upgrade handshake is aborted both chains are expected to increment to the
 * next sequence.
 */
export interface ErrorReceipt {
  /** the channel upgrade sequence */
  sequence: bigint;
  /** the error message detailing the cause of failure */
  message: string;
}
export interface ErrorReceiptProtoMsg {
  typeUrl: '/ibc.core.channel.v1.ErrorReceipt';
  value: Uint8Array;
}
/**
 * ErrorReceipt defines a type which encapsulates the upgrade sequence and error associated with the
 * upgrade handshake failure. When a channel upgrade handshake is aborted both chains are expected to increment to the
 * next sequence.
 */
export interface ErrorReceiptSDKType {
  sequence: bigint;
  message: string;
}
function createBaseUpgrade(): Upgrade {
  return {
    fields: UpgradeFields.fromPartial({}),
    timeout: Timeout.fromPartial({}),
    nextSequenceSend: BigInt(0),
  };
}
export const Upgrade = {
  typeUrl: '/ibc.core.channel.v1.Upgrade' as const,
  encode(
    message: Upgrade,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.fields !== undefined) {
      UpgradeFields.encode(message.fields, writer.uint32(10).fork()).ldelim();
    }
    if (message.timeout !== undefined) {
      Timeout.encode(message.timeout, writer.uint32(18).fork()).ldelim();
    }
    if (message.nextSequenceSend !== BigInt(0)) {
      writer.uint32(24).uint64(message.nextSequenceSend);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Upgrade {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUpgrade();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.fields = UpgradeFields.decode(reader, reader.uint32());
          break;
        case 2:
          message.timeout = Timeout.decode(reader, reader.uint32());
          break;
        case 3:
          message.nextSequenceSend = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Upgrade {
    return {
      fields: isSet(object.fields)
        ? UpgradeFields.fromJSON(object.fields)
        : undefined,
      timeout: isSet(object.timeout)
        ? Timeout.fromJSON(object.timeout)
        : undefined,
      nextSequenceSend: isSet(object.nextSequenceSend)
        ? BigInt(object.nextSequenceSend.toString())
        : BigInt(0),
    };
  },
  toJSON(message: Upgrade): JsonSafe<Upgrade> {
    const obj: any = {};
    message.fields !== undefined &&
      (obj.fields = message.fields
        ? UpgradeFields.toJSON(message.fields)
        : undefined);
    message.timeout !== undefined &&
      (obj.timeout = message.timeout
        ? Timeout.toJSON(message.timeout)
        : undefined);
    message.nextSequenceSend !== undefined &&
      (obj.nextSequenceSend = (
        message.nextSequenceSend || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(object: Partial<Upgrade>): Upgrade {
    const message = createBaseUpgrade();
    message.fields =
      object.fields !== undefined && object.fields !== null
        ? UpgradeFields.fromPartial(object.fields)
        : undefined;
    message.timeout =
      object.timeout !== undefined && object.timeout !== null
        ? Timeout.fromPartial(object.timeout)
        : undefined;
    message.nextSequenceSend =
      object.nextSequenceSend !== undefined && object.nextSequenceSend !== null
        ? BigInt(object.nextSequenceSend.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: UpgradeProtoMsg): Upgrade {
    return Upgrade.decode(message.value);
  },
  toProto(message: Upgrade): Uint8Array {
    return Upgrade.encode(message).finish();
  },
  toProtoMsg(message: Upgrade): UpgradeProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.Upgrade',
      value: Upgrade.encode(message).finish(),
    };
  },
};
function createBaseUpgradeFields(): UpgradeFields {
  return {
    ordering: 0,
    connectionHops: [],
    version: '',
  };
}
export const UpgradeFields = {
  typeUrl: '/ibc.core.channel.v1.UpgradeFields' as const,
  encode(
    message: UpgradeFields,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.ordering !== 0) {
      writer.uint32(8).int32(message.ordering);
    }
    for (const v of message.connectionHops) {
      writer.uint32(18).string(v!);
    }
    if (message.version !== '') {
      writer.uint32(26).string(message.version);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): UpgradeFields {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUpgradeFields();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ordering = reader.int32() as any;
          break;
        case 2:
          message.connectionHops.push(reader.string());
          break;
        case 3:
          message.version = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): UpgradeFields {
    return {
      ordering: isSet(object.ordering) ? orderFromJSON(object.ordering) : -1,
      connectionHops: Array.isArray(object?.connectionHops)
        ? object.connectionHops.map((e: any) => String(e))
        : [],
      version: isSet(object.version) ? String(object.version) : '',
    };
  },
  toJSON(message: UpgradeFields): JsonSafe<UpgradeFields> {
    const obj: any = {};
    message.ordering !== undefined &&
      (obj.ordering = orderToJSON(message.ordering));
    if (message.connectionHops) {
      obj.connectionHops = message.connectionHops.map(e => e);
    } else {
      obj.connectionHops = [];
    }
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },
  fromPartial(object: Partial<UpgradeFields>): UpgradeFields {
    const message = createBaseUpgradeFields();
    message.ordering = object.ordering ?? 0;
    message.connectionHops = object.connectionHops?.map(e => e) || [];
    message.version = object.version ?? '';
    return message;
  },
  fromProtoMsg(message: UpgradeFieldsProtoMsg): UpgradeFields {
    return UpgradeFields.decode(message.value);
  },
  toProto(message: UpgradeFields): Uint8Array {
    return UpgradeFields.encode(message).finish();
  },
  toProtoMsg(message: UpgradeFields): UpgradeFieldsProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.UpgradeFields',
      value: UpgradeFields.encode(message).finish(),
    };
  },
};
function createBaseErrorReceipt(): ErrorReceipt {
  return {
    sequence: BigInt(0),
    message: '',
  };
}
export const ErrorReceipt = {
  typeUrl: '/ibc.core.channel.v1.ErrorReceipt' as const,
  encode(
    message: ErrorReceipt,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sequence !== BigInt(0)) {
      writer.uint32(8).uint64(message.sequence);
    }
    if (message.message !== '') {
      writer.uint32(18).string(message.message);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ErrorReceipt {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseErrorReceipt();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sequence = reader.uint64();
          break;
        case 2:
          message.message = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ErrorReceipt {
    return {
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
      message: isSet(object.message) ? String(object.message) : '',
    };
  },
  toJSON(message: ErrorReceipt): JsonSafe<ErrorReceipt> {
    const obj: any = {};
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    message.message !== undefined && (obj.message = message.message);
    return obj;
  },
  fromPartial(object: Partial<ErrorReceipt>): ErrorReceipt {
    const message = createBaseErrorReceipt();
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    message.message = object.message ?? '';
    return message;
  },
  fromProtoMsg(message: ErrorReceiptProtoMsg): ErrorReceipt {
    return ErrorReceipt.decode(message.value);
  },
  toProto(message: ErrorReceipt): Uint8Array {
    return ErrorReceipt.encode(message).finish();
  },
  toProtoMsg(message: ErrorReceipt): ErrorReceiptProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.ErrorReceipt',
      value: ErrorReceipt.encode(message).finish(),
    };
  },
};
