//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
/** AccountRegistered is emitted whenever a new forwarding account is registered. */
export interface AccountRegistered {
  /** address is the address of the forwarding account. */
  address: string;
  /** channel is the channel id that funds are forwarded through. */
  channel: string;
  /** recipient is the address of the recipient of forwards. */
  recipient: string;
  /** fallback is the address of the fallback account. */
  fallback: string;
}
export interface AccountRegisteredProtoMsg {
  typeUrl: '/noble.forwarding.v1.AccountRegistered';
  value: Uint8Array;
}
/** AccountRegistered is emitted whenever a new forwarding account is registered. */
export interface AccountRegisteredSDKType {
  address: string;
  channel: string;
  recipient: string;
  fallback: string;
}
/** AccountCleared is emitted whenever a forwarding account is cleared. */
export interface AccountCleared {
  /** address is the address of the forwarding account. */
  address: string;
  /** recipient is the address of the fallback account. */
  recipient: string;
}
export interface AccountClearedProtoMsg {
  typeUrl: '/noble.forwarding.v1.AccountCleared';
  value: Uint8Array;
}
/** AccountCleared is emitted whenever a forwarding account is cleared. */
export interface AccountClearedSDKType {
  address: string;
  recipient: string;
}
/** AllowedDenomsConfigured is emitted whenever the allowed denoms are updated. */
export interface AllowedDenomsConfigured {
  /** previous_denoms is the list of previously allowed denoms. */
  previousDenoms: string[];
  /** current_denoms is the list of currently allowed denoms. */
  currentDenoms: string[];
}
export interface AllowedDenomsConfiguredProtoMsg {
  typeUrl: '/noble.forwarding.v1.AllowedDenomsConfigured';
  value: Uint8Array;
}
/** AllowedDenomsConfigured is emitted whenever the allowed denoms are updated. */
export interface AllowedDenomsConfiguredSDKType {
  previous_denoms: string[];
  current_denoms: string[];
}
function createBaseAccountRegistered(): AccountRegistered {
  return {
    address: '',
    channel: '',
    recipient: '',
    fallback: '',
  };
}
export const AccountRegistered = {
  typeUrl: '/noble.forwarding.v1.AccountRegistered' as const,
  encode(
    message: AccountRegistered,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.channel !== '') {
      writer.uint32(18).string(message.channel);
    }
    if (message.recipient !== '') {
      writer.uint32(26).string(message.recipient);
    }
    if (message.fallback !== '') {
      writer.uint32(34).string(message.fallback);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AccountRegistered {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountRegistered();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.channel = reader.string();
          break;
        case 3:
          message.recipient = reader.string();
          break;
        case 4:
          message.fallback = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountRegistered {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      channel: isSet(object.channel) ? String(object.channel) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      fallback: isSet(object.fallback) ? String(object.fallback) : '',
    };
  },
  toJSON(message: AccountRegistered): JsonSafe<AccountRegistered> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.channel !== undefined && (obj.channel = message.channel);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    message.fallback !== undefined && (obj.fallback = message.fallback);
    return obj;
  },
  fromPartial(object: Partial<AccountRegistered>): AccountRegistered {
    const message = createBaseAccountRegistered();
    message.address = object.address ?? '';
    message.channel = object.channel ?? '';
    message.recipient = object.recipient ?? '';
    message.fallback = object.fallback ?? '';
    return message;
  },
  fromProtoMsg(message: AccountRegisteredProtoMsg): AccountRegistered {
    return AccountRegistered.decode(message.value);
  },
  toProto(message: AccountRegistered): Uint8Array {
    return AccountRegistered.encode(message).finish();
  },
  toProtoMsg(message: AccountRegistered): AccountRegisteredProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.AccountRegistered',
      value: AccountRegistered.encode(message).finish(),
    };
  },
};
function createBaseAccountCleared(): AccountCleared {
  return {
    address: '',
    recipient: '',
  };
}
export const AccountCleared = {
  typeUrl: '/noble.forwarding.v1.AccountCleared' as const,
  encode(
    message: AccountCleared,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.recipient !== '') {
      writer.uint32(18).string(message.recipient);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AccountCleared {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountCleared();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.recipient = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountCleared {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
    };
  },
  toJSON(message: AccountCleared): JsonSafe<AccountCleared> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    return obj;
  },
  fromPartial(object: Partial<AccountCleared>): AccountCleared {
    const message = createBaseAccountCleared();
    message.address = object.address ?? '';
    message.recipient = object.recipient ?? '';
    return message;
  },
  fromProtoMsg(message: AccountClearedProtoMsg): AccountCleared {
    return AccountCleared.decode(message.value);
  },
  toProto(message: AccountCleared): Uint8Array {
    return AccountCleared.encode(message).finish();
  },
  toProtoMsg(message: AccountCleared): AccountClearedProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.AccountCleared',
      value: AccountCleared.encode(message).finish(),
    };
  },
};
function createBaseAllowedDenomsConfigured(): AllowedDenomsConfigured {
  return {
    previousDenoms: [],
    currentDenoms: [],
  };
}
export const AllowedDenomsConfigured = {
  typeUrl: '/noble.forwarding.v1.AllowedDenomsConfigured' as const,
  encode(
    message: AllowedDenomsConfigured,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.previousDenoms) {
      writer.uint32(10).string(v!);
    }
    for (const v of message.currentDenoms) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AllowedDenomsConfigured {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAllowedDenomsConfigured();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.previousDenoms.push(reader.string());
          break;
        case 2:
          message.currentDenoms.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AllowedDenomsConfigured {
    return {
      previousDenoms: Array.isArray(object?.previousDenoms)
        ? object.previousDenoms.map((e: any) => String(e))
        : [],
      currentDenoms: Array.isArray(object?.currentDenoms)
        ? object.currentDenoms.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: AllowedDenomsConfigured): JsonSafe<AllowedDenomsConfigured> {
    const obj: any = {};
    if (message.previousDenoms) {
      obj.previousDenoms = message.previousDenoms.map(e => e);
    } else {
      obj.previousDenoms = [];
    }
    if (message.currentDenoms) {
      obj.currentDenoms = message.currentDenoms.map(e => e);
    } else {
      obj.currentDenoms = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AllowedDenomsConfigured>,
  ): AllowedDenomsConfigured {
    const message = createBaseAllowedDenomsConfigured();
    message.previousDenoms = object.previousDenoms?.map(e => e) || [];
    message.currentDenoms = object.currentDenoms?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: AllowedDenomsConfiguredProtoMsg,
  ): AllowedDenomsConfigured {
    return AllowedDenomsConfigured.decode(message.value);
  },
  toProto(message: AllowedDenomsConfigured): Uint8Array {
    return AllowedDenomsConfigured.encode(message).finish();
  },
  toProtoMsg(
    message: AllowedDenomsConfigured,
  ): AllowedDenomsConfiguredProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.AllowedDenomsConfigured',
      value: AllowedDenomsConfigured.encode(message).finish(),
    };
  },
};
