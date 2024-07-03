//@ts-nocheck
import { Duration, DurationSDKType } from '../../google/protobuf/duration.js';
import { Coin, CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { PeriodLock, PeriodLockSDKType } from './lock.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { JsonSafe } from '../../json-safe.js';
export interface MsgLockTokens {
  owner: string;
  duration: Duration;
  coins: Coin[];
}
export interface MsgLockTokensProtoMsg {
  typeUrl: '/osmosis.lockup.MsgLockTokens';
  value: Uint8Array;
}
export interface MsgLockTokensSDKType {
  owner: string;
  duration: DurationSDKType;
  coins: CoinSDKType[];
}
export interface MsgLockTokensResponse {
  ID: bigint;
}
export interface MsgLockTokensResponseProtoMsg {
  typeUrl: '/osmosis.lockup.MsgLockTokensResponse';
  value: Uint8Array;
}
export interface MsgLockTokensResponseSDKType {
  ID: bigint;
}
export interface MsgBeginUnlockingAll {
  owner: string;
}
export interface MsgBeginUnlockingAllProtoMsg {
  typeUrl: '/osmosis.lockup.MsgBeginUnlockingAll';
  value: Uint8Array;
}
export interface MsgBeginUnlockingAllSDKType {
  owner: string;
}
export interface MsgBeginUnlockingAllResponse {
  unlocks: PeriodLock[];
}
export interface MsgBeginUnlockingAllResponseProtoMsg {
  typeUrl: '/osmosis.lockup.MsgBeginUnlockingAllResponse';
  value: Uint8Array;
}
export interface MsgBeginUnlockingAllResponseSDKType {
  unlocks: PeriodLockSDKType[];
}
export interface MsgBeginUnlocking {
  owner: string;
  ID: bigint;
  /** Amount of unlocking coins. Unlock all if not set. */
  coins: Coin[];
}
export interface MsgBeginUnlockingProtoMsg {
  typeUrl: '/osmosis.lockup.MsgBeginUnlocking';
  value: Uint8Array;
}
export interface MsgBeginUnlockingSDKType {
  owner: string;
  ID: bigint;
  coins: CoinSDKType[];
}
export interface MsgBeginUnlockingResponse {
  success: boolean;
}
export interface MsgBeginUnlockingResponseProtoMsg {
  typeUrl: '/osmosis.lockup.MsgBeginUnlockingResponse';
  value: Uint8Array;
}
export interface MsgBeginUnlockingResponseSDKType {
  success: boolean;
}
/**
 * MsgExtendLockup extends the existing lockup's duration.
 * The new duration is longer than the original.
 */
export interface MsgExtendLockup {
  owner: string;
  ID: bigint;
  /**
   * duration to be set. fails if lower than the current duration, or is
   * unlocking
   */
  duration: Duration;
}
export interface MsgExtendLockupProtoMsg {
  typeUrl: '/osmosis.lockup.MsgExtendLockup';
  value: Uint8Array;
}
/**
 * MsgExtendLockup extends the existing lockup's duration.
 * The new duration is longer than the original.
 */
export interface MsgExtendLockupSDKType {
  owner: string;
  ID: bigint;
  duration: DurationSDKType;
}
export interface MsgExtendLockupResponse {
  success: boolean;
}
export interface MsgExtendLockupResponseProtoMsg {
  typeUrl: '/osmosis.lockup.MsgExtendLockupResponse';
  value: Uint8Array;
}
export interface MsgExtendLockupResponseSDKType {
  success: boolean;
}
/**
 * MsgForceUnlock unlocks locks immediately for
 * addresses registered via governance.
 */
export interface MsgForceUnlock {
  owner: string;
  ID: bigint;
  /** Amount of unlocking coins. Unlock all if not set. */
  coins: Coin[];
}
export interface MsgForceUnlockProtoMsg {
  typeUrl: '/osmosis.lockup.MsgForceUnlock';
  value: Uint8Array;
}
/**
 * MsgForceUnlock unlocks locks immediately for
 * addresses registered via governance.
 */
export interface MsgForceUnlockSDKType {
  owner: string;
  ID: bigint;
  coins: CoinSDKType[];
}
export interface MsgForceUnlockResponse {
  success: boolean;
}
export interface MsgForceUnlockResponseProtoMsg {
  typeUrl: '/osmosis.lockup.MsgForceUnlockResponse';
  value: Uint8Array;
}
export interface MsgForceUnlockResponseSDKType {
  success: boolean;
}
function createBaseMsgLockTokens(): MsgLockTokens {
  return {
    owner: '',
    duration: Duration.fromPartial({}),
    coins: [],
  };
}
export const MsgLockTokens = {
  typeUrl: '/osmosis.lockup.MsgLockTokens',
  encode(
    message: MsgLockTokens,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgLockTokens {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLockTokens();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        case 3:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLockTokens {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgLockTokens): JsonSafe<MsgLockTokens> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgLockTokens>): MsgLockTokens {
    const message = createBaseMsgLockTokens();
    message.owner = object.owner ?? '';
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgLockTokensProtoMsg): MsgLockTokens {
    return MsgLockTokens.decode(message.value);
  },
  toProto(message: MsgLockTokens): Uint8Array {
    return MsgLockTokens.encode(message).finish();
  },
  toProtoMsg(message: MsgLockTokens): MsgLockTokensProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgLockTokens',
      value: MsgLockTokens.encode(message).finish(),
    };
  },
};
function createBaseMsgLockTokensResponse(): MsgLockTokensResponse {
  return {
    ID: BigInt(0),
  };
}
export const MsgLockTokensResponse = {
  typeUrl: '/osmosis.lockup.MsgLockTokensResponse',
  encode(
    message: MsgLockTokensResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.ID !== BigInt(0)) {
      writer.uint32(8).uint64(message.ID);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgLockTokensResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLockTokensResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ID = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLockTokensResponse {
    return {
      ID: isSet(object.ID) ? BigInt(object.ID.toString()) : BigInt(0),
    };
  },
  toJSON(message: MsgLockTokensResponse): JsonSafe<MsgLockTokensResponse> {
    const obj: any = {};
    message.ID !== undefined && (obj.ID = (message.ID || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgLockTokensResponse>): MsgLockTokensResponse {
    const message = createBaseMsgLockTokensResponse();
    message.ID =
      object.ID !== undefined && object.ID !== null
        ? BigInt(object.ID.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: MsgLockTokensResponseProtoMsg): MsgLockTokensResponse {
    return MsgLockTokensResponse.decode(message.value);
  },
  toProto(message: MsgLockTokensResponse): Uint8Array {
    return MsgLockTokensResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgLockTokensResponse): MsgLockTokensResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgLockTokensResponse',
      value: MsgLockTokensResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgBeginUnlockingAll(): MsgBeginUnlockingAll {
  return {
    owner: '',
  };
}
export const MsgBeginUnlockingAll = {
  typeUrl: '/osmosis.lockup.MsgBeginUnlockingAll',
  encode(
    message: MsgBeginUnlockingAll,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgBeginUnlockingAll {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgBeginUnlockingAll();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgBeginUnlockingAll {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
    };
  },
  toJSON(message: MsgBeginUnlockingAll): JsonSafe<MsgBeginUnlockingAll> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    return obj;
  },
  fromPartial(object: Partial<MsgBeginUnlockingAll>): MsgBeginUnlockingAll {
    const message = createBaseMsgBeginUnlockingAll();
    message.owner = object.owner ?? '';
    return message;
  },
  fromProtoMsg(message: MsgBeginUnlockingAllProtoMsg): MsgBeginUnlockingAll {
    return MsgBeginUnlockingAll.decode(message.value);
  },
  toProto(message: MsgBeginUnlockingAll): Uint8Array {
    return MsgBeginUnlockingAll.encode(message).finish();
  },
  toProtoMsg(message: MsgBeginUnlockingAll): MsgBeginUnlockingAllProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgBeginUnlockingAll',
      value: MsgBeginUnlockingAll.encode(message).finish(),
    };
  },
};
function createBaseMsgBeginUnlockingAllResponse(): MsgBeginUnlockingAllResponse {
  return {
    unlocks: [],
  };
}
export const MsgBeginUnlockingAllResponse = {
  typeUrl: '/osmosis.lockup.MsgBeginUnlockingAllResponse',
  encode(
    message: MsgBeginUnlockingAllResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.unlocks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgBeginUnlockingAllResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgBeginUnlockingAllResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.unlocks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgBeginUnlockingAllResponse {
    return {
      unlocks: Array.isArray(object?.unlocks)
        ? object.unlocks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: MsgBeginUnlockingAllResponse,
  ): JsonSafe<MsgBeginUnlockingAllResponse> {
    const obj: any = {};
    if (message.unlocks) {
      obj.unlocks = message.unlocks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.unlocks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgBeginUnlockingAllResponse>,
  ): MsgBeginUnlockingAllResponse {
    const message = createBaseMsgBeginUnlockingAllResponse();
    message.unlocks = object.unlocks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgBeginUnlockingAllResponseProtoMsg,
  ): MsgBeginUnlockingAllResponse {
    return MsgBeginUnlockingAllResponse.decode(message.value);
  },
  toProto(message: MsgBeginUnlockingAllResponse): Uint8Array {
    return MsgBeginUnlockingAllResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgBeginUnlockingAllResponse,
  ): MsgBeginUnlockingAllResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgBeginUnlockingAllResponse',
      value: MsgBeginUnlockingAllResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgBeginUnlocking(): MsgBeginUnlocking {
  return {
    owner: '',
    ID: BigInt(0),
    coins: [],
  };
}
export const MsgBeginUnlocking = {
  typeUrl: '/osmosis.lockup.MsgBeginUnlocking',
  encode(
    message: MsgBeginUnlocking,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.ID !== BigInt(0)) {
      writer.uint32(16).uint64(message.ID);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgBeginUnlocking {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgBeginUnlocking();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.ID = reader.uint64();
          break;
        case 3:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgBeginUnlocking {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      ID: isSet(object.ID) ? BigInt(object.ID.toString()) : BigInt(0),
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgBeginUnlocking): JsonSafe<MsgBeginUnlocking> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.ID !== undefined && (obj.ID = (message.ID || BigInt(0)).toString());
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgBeginUnlocking>): MsgBeginUnlocking {
    const message = createBaseMsgBeginUnlocking();
    message.owner = object.owner ?? '';
    message.ID =
      object.ID !== undefined && object.ID !== null
        ? BigInt(object.ID.toString())
        : BigInt(0);
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgBeginUnlockingProtoMsg): MsgBeginUnlocking {
    return MsgBeginUnlocking.decode(message.value);
  },
  toProto(message: MsgBeginUnlocking): Uint8Array {
    return MsgBeginUnlocking.encode(message).finish();
  },
  toProtoMsg(message: MsgBeginUnlocking): MsgBeginUnlockingProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgBeginUnlocking',
      value: MsgBeginUnlocking.encode(message).finish(),
    };
  },
};
function createBaseMsgBeginUnlockingResponse(): MsgBeginUnlockingResponse {
  return {
    success: false,
  };
}
export const MsgBeginUnlockingResponse = {
  typeUrl: '/osmosis.lockup.MsgBeginUnlockingResponse',
  encode(
    message: MsgBeginUnlockingResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.success === true) {
      writer.uint32(8).bool(message.success);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgBeginUnlockingResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgBeginUnlockingResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.success = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgBeginUnlockingResponse {
    return {
      success: isSet(object.success) ? Boolean(object.success) : false,
    };
  },
  toJSON(
    message: MsgBeginUnlockingResponse,
  ): JsonSafe<MsgBeginUnlockingResponse> {
    const obj: any = {};
    message.success !== undefined && (obj.success = message.success);
    return obj;
  },
  fromPartial(
    object: Partial<MsgBeginUnlockingResponse>,
  ): MsgBeginUnlockingResponse {
    const message = createBaseMsgBeginUnlockingResponse();
    message.success = object.success ?? false;
    return message;
  },
  fromProtoMsg(
    message: MsgBeginUnlockingResponseProtoMsg,
  ): MsgBeginUnlockingResponse {
    return MsgBeginUnlockingResponse.decode(message.value);
  },
  toProto(message: MsgBeginUnlockingResponse): Uint8Array {
    return MsgBeginUnlockingResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgBeginUnlockingResponse,
  ): MsgBeginUnlockingResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgBeginUnlockingResponse',
      value: MsgBeginUnlockingResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgExtendLockup(): MsgExtendLockup {
  return {
    owner: '',
    ID: BigInt(0),
    duration: Duration.fromPartial({}),
  };
}
export const MsgExtendLockup = {
  typeUrl: '/osmosis.lockup.MsgExtendLockup',
  encode(
    message: MsgExtendLockup,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.ID !== BigInt(0)) {
      writer.uint32(16).uint64(message.ID);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgExtendLockup {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExtendLockup();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.ID = reader.uint64();
          break;
        case 3:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExtendLockup {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      ID: isSet(object.ID) ? BigInt(object.ID.toString()) : BigInt(0),
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
    };
  },
  toJSON(message: MsgExtendLockup): JsonSafe<MsgExtendLockup> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.ID !== undefined && (obj.ID = (message.ID || BigInt(0)).toString());
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgExtendLockup>): MsgExtendLockup {
    const message = createBaseMsgExtendLockup();
    message.owner = object.owner ?? '';
    message.ID =
      object.ID !== undefined && object.ID !== null
        ? BigInt(object.ID.toString())
        : BigInt(0);
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgExtendLockupProtoMsg): MsgExtendLockup {
    return MsgExtendLockup.decode(message.value);
  },
  toProto(message: MsgExtendLockup): Uint8Array {
    return MsgExtendLockup.encode(message).finish();
  },
  toProtoMsg(message: MsgExtendLockup): MsgExtendLockupProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgExtendLockup',
      value: MsgExtendLockup.encode(message).finish(),
    };
  },
};
function createBaseMsgExtendLockupResponse(): MsgExtendLockupResponse {
  return {
    success: false,
  };
}
export const MsgExtendLockupResponse = {
  typeUrl: '/osmosis.lockup.MsgExtendLockupResponse',
  encode(
    message: MsgExtendLockupResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.success === true) {
      writer.uint32(8).bool(message.success);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgExtendLockupResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExtendLockupResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.success = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExtendLockupResponse {
    return {
      success: isSet(object.success) ? Boolean(object.success) : false,
    };
  },
  toJSON(message: MsgExtendLockupResponse): JsonSafe<MsgExtendLockupResponse> {
    const obj: any = {};
    message.success !== undefined && (obj.success = message.success);
    return obj;
  },
  fromPartial(
    object: Partial<MsgExtendLockupResponse>,
  ): MsgExtendLockupResponse {
    const message = createBaseMsgExtendLockupResponse();
    message.success = object.success ?? false;
    return message;
  },
  fromProtoMsg(
    message: MsgExtendLockupResponseProtoMsg,
  ): MsgExtendLockupResponse {
    return MsgExtendLockupResponse.decode(message.value);
  },
  toProto(message: MsgExtendLockupResponse): Uint8Array {
    return MsgExtendLockupResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgExtendLockupResponse,
  ): MsgExtendLockupResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgExtendLockupResponse',
      value: MsgExtendLockupResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgForceUnlock(): MsgForceUnlock {
  return {
    owner: '',
    ID: BigInt(0),
    coins: [],
  };
}
export const MsgForceUnlock = {
  typeUrl: '/osmosis.lockup.MsgForceUnlock',
  encode(
    message: MsgForceUnlock,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.ID !== BigInt(0)) {
      writer.uint32(16).uint64(message.ID);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgForceUnlock {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgForceUnlock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.ID = reader.uint64();
          break;
        case 3:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgForceUnlock {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      ID: isSet(object.ID) ? BigInt(object.ID.toString()) : BigInt(0),
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgForceUnlock): JsonSafe<MsgForceUnlock> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.ID !== undefined && (obj.ID = (message.ID || BigInt(0)).toString());
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgForceUnlock>): MsgForceUnlock {
    const message = createBaseMsgForceUnlock();
    message.owner = object.owner ?? '';
    message.ID =
      object.ID !== undefined && object.ID !== null
        ? BigInt(object.ID.toString())
        : BigInt(0);
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgForceUnlockProtoMsg): MsgForceUnlock {
    return MsgForceUnlock.decode(message.value);
  },
  toProto(message: MsgForceUnlock): Uint8Array {
    return MsgForceUnlock.encode(message).finish();
  },
  toProtoMsg(message: MsgForceUnlock): MsgForceUnlockProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgForceUnlock',
      value: MsgForceUnlock.encode(message).finish(),
    };
  },
};
function createBaseMsgForceUnlockResponse(): MsgForceUnlockResponse {
  return {
    success: false,
  };
}
export const MsgForceUnlockResponse = {
  typeUrl: '/osmosis.lockup.MsgForceUnlockResponse',
  encode(
    message: MsgForceUnlockResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.success === true) {
      writer.uint32(8).bool(message.success);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgForceUnlockResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgForceUnlockResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.success = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgForceUnlockResponse {
    return {
      success: isSet(object.success) ? Boolean(object.success) : false,
    };
  },
  toJSON(message: MsgForceUnlockResponse): JsonSafe<MsgForceUnlockResponse> {
    const obj: any = {};
    message.success !== undefined && (obj.success = message.success);
    return obj;
  },
  fromPartial(object: Partial<MsgForceUnlockResponse>): MsgForceUnlockResponse {
    const message = createBaseMsgForceUnlockResponse();
    message.success = object.success ?? false;
    return message;
  },
  fromProtoMsg(
    message: MsgForceUnlockResponseProtoMsg,
  ): MsgForceUnlockResponse {
    return MsgForceUnlockResponse.decode(message.value);
  },
  toProto(message: MsgForceUnlockResponse): Uint8Array {
    return MsgForceUnlockResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgForceUnlockResponse): MsgForceUnlockResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.MsgForceUnlockResponse',
      value: MsgForceUnlockResponse.encode(message).finish(),
    };
  },
};
