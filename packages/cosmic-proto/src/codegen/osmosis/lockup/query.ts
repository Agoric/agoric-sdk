//@ts-nocheck
import {
  Timestamp,
  TimestampSDKType,
} from '../../google/protobuf/timestamp.js';
import { Duration, DurationSDKType } from '../../google/protobuf/duration.js';
import { Coin, CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import {
  PeriodLock,
  PeriodLockSDKType,
  SyntheticLock,
  SyntheticLockSDKType,
} from './lock.js';
import { Params, ParamsSDKType } from './params.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { JsonSafe } from '../../json-safe.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../helpers.js';
export interface ModuleBalanceRequest {}
export interface ModuleBalanceRequestProtoMsg {
  typeUrl: '/osmosis.lockup.ModuleBalanceRequest';
  value: Uint8Array;
}
export interface ModuleBalanceRequestSDKType {}
export interface ModuleBalanceResponse {
  coins: Coin[];
}
export interface ModuleBalanceResponseProtoMsg {
  typeUrl: '/osmosis.lockup.ModuleBalanceResponse';
  value: Uint8Array;
}
export interface ModuleBalanceResponseSDKType {
  coins: CoinSDKType[];
}
export interface ModuleLockedAmountRequest {}
export interface ModuleLockedAmountRequestProtoMsg {
  typeUrl: '/osmosis.lockup.ModuleLockedAmountRequest';
  value: Uint8Array;
}
export interface ModuleLockedAmountRequestSDKType {}
export interface ModuleLockedAmountResponse {
  coins: Coin[];
}
export interface ModuleLockedAmountResponseProtoMsg {
  typeUrl: '/osmosis.lockup.ModuleLockedAmountResponse';
  value: Uint8Array;
}
export interface ModuleLockedAmountResponseSDKType {
  coins: CoinSDKType[];
}
export interface AccountUnlockableCoinsRequest {
  owner: string;
}
export interface AccountUnlockableCoinsRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountUnlockableCoinsRequest';
  value: Uint8Array;
}
export interface AccountUnlockableCoinsRequestSDKType {
  owner: string;
}
export interface AccountUnlockableCoinsResponse {
  coins: Coin[];
}
export interface AccountUnlockableCoinsResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountUnlockableCoinsResponse';
  value: Uint8Array;
}
export interface AccountUnlockableCoinsResponseSDKType {
  coins: CoinSDKType[];
}
export interface AccountUnlockingCoinsRequest {
  owner: string;
}
export interface AccountUnlockingCoinsRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountUnlockingCoinsRequest';
  value: Uint8Array;
}
export interface AccountUnlockingCoinsRequestSDKType {
  owner: string;
}
export interface AccountUnlockingCoinsResponse {
  coins: Coin[];
}
export interface AccountUnlockingCoinsResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountUnlockingCoinsResponse';
  value: Uint8Array;
}
export interface AccountUnlockingCoinsResponseSDKType {
  coins: CoinSDKType[];
}
export interface AccountLockedCoinsRequest {
  owner: string;
}
export interface AccountLockedCoinsRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedCoinsRequest';
  value: Uint8Array;
}
export interface AccountLockedCoinsRequestSDKType {
  owner: string;
}
export interface AccountLockedCoinsResponse {
  coins: Coin[];
}
export interface AccountLockedCoinsResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedCoinsResponse';
  value: Uint8Array;
}
export interface AccountLockedCoinsResponseSDKType {
  coins: CoinSDKType[];
}
export interface AccountLockedPastTimeRequest {
  owner: string;
  timestamp: Timestamp;
}
export interface AccountLockedPastTimeRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeRequest';
  value: Uint8Array;
}
export interface AccountLockedPastTimeRequestSDKType {
  owner: string;
  timestamp: TimestampSDKType;
}
export interface AccountLockedPastTimeResponse {
  locks: PeriodLock[];
}
export interface AccountLockedPastTimeResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeResponse';
  value: Uint8Array;
}
export interface AccountLockedPastTimeResponseSDKType {
  locks: PeriodLockSDKType[];
}
export interface AccountLockedPastTimeNotUnlockingOnlyRequest {
  owner: string;
  timestamp: Timestamp;
}
export interface AccountLockedPastTimeNotUnlockingOnlyRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeNotUnlockingOnlyRequest';
  value: Uint8Array;
}
export interface AccountLockedPastTimeNotUnlockingOnlyRequestSDKType {
  owner: string;
  timestamp: TimestampSDKType;
}
export interface AccountLockedPastTimeNotUnlockingOnlyResponse {
  locks: PeriodLock[];
}
export interface AccountLockedPastTimeNotUnlockingOnlyResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeNotUnlockingOnlyResponse';
  value: Uint8Array;
}
export interface AccountLockedPastTimeNotUnlockingOnlyResponseSDKType {
  locks: PeriodLockSDKType[];
}
export interface AccountUnlockedBeforeTimeRequest {
  owner: string;
  timestamp: Timestamp;
}
export interface AccountUnlockedBeforeTimeRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountUnlockedBeforeTimeRequest';
  value: Uint8Array;
}
export interface AccountUnlockedBeforeTimeRequestSDKType {
  owner: string;
  timestamp: TimestampSDKType;
}
export interface AccountUnlockedBeforeTimeResponse {
  locks: PeriodLock[];
}
export interface AccountUnlockedBeforeTimeResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountUnlockedBeforeTimeResponse';
  value: Uint8Array;
}
export interface AccountUnlockedBeforeTimeResponseSDKType {
  locks: PeriodLockSDKType[];
}
export interface AccountLockedPastTimeDenomRequest {
  owner: string;
  timestamp: Timestamp;
  denom: string;
}
export interface AccountLockedPastTimeDenomRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeDenomRequest';
  value: Uint8Array;
}
export interface AccountLockedPastTimeDenomRequestSDKType {
  owner: string;
  timestamp: TimestampSDKType;
  denom: string;
}
export interface AccountLockedPastTimeDenomResponse {
  locks: PeriodLock[];
}
export interface AccountLockedPastTimeDenomResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeDenomResponse';
  value: Uint8Array;
}
export interface AccountLockedPastTimeDenomResponseSDKType {
  locks: PeriodLockSDKType[];
}
export interface LockedDenomRequest {
  denom: string;
  duration: Duration;
}
export interface LockedDenomRequestProtoMsg {
  typeUrl: '/osmosis.lockup.LockedDenomRequest';
  value: Uint8Array;
}
export interface LockedDenomRequestSDKType {
  denom: string;
  duration: DurationSDKType;
}
export interface LockedDenomResponse {
  amount: string;
}
export interface LockedDenomResponseProtoMsg {
  typeUrl: '/osmosis.lockup.LockedDenomResponse';
  value: Uint8Array;
}
export interface LockedDenomResponseSDKType {
  amount: string;
}
export interface LockedRequest {
  lockId: bigint;
}
export interface LockedRequestProtoMsg {
  typeUrl: '/osmosis.lockup.LockedRequest';
  value: Uint8Array;
}
export interface LockedRequestSDKType {
  lock_id: bigint;
}
export interface LockedResponse {
  lock?: PeriodLock;
}
export interface LockedResponseProtoMsg {
  typeUrl: '/osmosis.lockup.LockedResponse';
  value: Uint8Array;
}
export interface LockedResponseSDKType {
  lock?: PeriodLockSDKType;
}
export interface SyntheticLockupsByLockupIDRequest {
  lockId: bigint;
}
export interface SyntheticLockupsByLockupIDRequestProtoMsg {
  typeUrl: '/osmosis.lockup.SyntheticLockupsByLockupIDRequest';
  value: Uint8Array;
}
export interface SyntheticLockupsByLockupIDRequestSDKType {
  lock_id: bigint;
}
export interface SyntheticLockupsByLockupIDResponse {
  syntheticLocks: SyntheticLock[];
}
export interface SyntheticLockupsByLockupIDResponseProtoMsg {
  typeUrl: '/osmosis.lockup.SyntheticLockupsByLockupIDResponse';
  value: Uint8Array;
}
export interface SyntheticLockupsByLockupIDResponseSDKType {
  synthetic_locks: SyntheticLockSDKType[];
}
export interface AccountLockedLongerDurationRequest {
  owner: string;
  duration: Duration;
}
export interface AccountLockedLongerDurationRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationRequest';
  value: Uint8Array;
}
export interface AccountLockedLongerDurationRequestSDKType {
  owner: string;
  duration: DurationSDKType;
}
export interface AccountLockedLongerDurationResponse {
  locks: PeriodLock[];
}
export interface AccountLockedLongerDurationResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationResponse';
  value: Uint8Array;
}
export interface AccountLockedLongerDurationResponseSDKType {
  locks: PeriodLockSDKType[];
}
export interface AccountLockedDurationRequest {
  owner: string;
  duration: Duration;
}
export interface AccountLockedDurationRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedDurationRequest';
  value: Uint8Array;
}
export interface AccountLockedDurationRequestSDKType {
  owner: string;
  duration: DurationSDKType;
}
export interface AccountLockedDurationResponse {
  locks: PeriodLock[];
}
export interface AccountLockedDurationResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedDurationResponse';
  value: Uint8Array;
}
export interface AccountLockedDurationResponseSDKType {
  locks: PeriodLockSDKType[];
}
export interface AccountLockedLongerDurationNotUnlockingOnlyRequest {
  owner: string;
  duration: Duration;
}
export interface AccountLockedLongerDurationNotUnlockingOnlyRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationNotUnlockingOnlyRequest';
  value: Uint8Array;
}
export interface AccountLockedLongerDurationNotUnlockingOnlyRequestSDKType {
  owner: string;
  duration: DurationSDKType;
}
export interface AccountLockedLongerDurationNotUnlockingOnlyResponse {
  locks: PeriodLock[];
}
export interface AccountLockedLongerDurationNotUnlockingOnlyResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationNotUnlockingOnlyResponse';
  value: Uint8Array;
}
export interface AccountLockedLongerDurationNotUnlockingOnlyResponseSDKType {
  locks: PeriodLockSDKType[];
}
export interface AccountLockedLongerDurationDenomRequest {
  owner: string;
  duration: Duration;
  denom: string;
}
export interface AccountLockedLongerDurationDenomRequestProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationDenomRequest';
  value: Uint8Array;
}
export interface AccountLockedLongerDurationDenomRequestSDKType {
  owner: string;
  duration: DurationSDKType;
  denom: string;
}
export interface AccountLockedLongerDurationDenomResponse {
  locks: PeriodLock[];
}
export interface AccountLockedLongerDurationDenomResponseProtoMsg {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationDenomResponse';
  value: Uint8Array;
}
export interface AccountLockedLongerDurationDenomResponseSDKType {
  locks: PeriodLockSDKType[];
}
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/osmosis.lockup.QueryParamsRequest';
  value: Uint8Array;
}
export interface QueryParamsRequestSDKType {}
export interface QueryParamsResponse {
  params: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/osmosis.lockup.QueryParamsResponse';
  value: Uint8Array;
}
export interface QueryParamsResponseSDKType {
  params: ParamsSDKType;
}
function createBaseModuleBalanceRequest(): ModuleBalanceRequest {
  return {};
}
export const ModuleBalanceRequest = {
  typeUrl: '/osmosis.lockup.ModuleBalanceRequest',
  encode(
    _: ModuleBalanceRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ModuleBalanceRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseModuleBalanceRequest();
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
  fromJSON(_: any): ModuleBalanceRequest {
    return {};
  },
  toJSON(_: ModuleBalanceRequest): JsonSafe<ModuleBalanceRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<ModuleBalanceRequest>): ModuleBalanceRequest {
    const message = createBaseModuleBalanceRequest();
    return message;
  },
  fromProtoMsg(message: ModuleBalanceRequestProtoMsg): ModuleBalanceRequest {
    return ModuleBalanceRequest.decode(message.value);
  },
  toProto(message: ModuleBalanceRequest): Uint8Array {
    return ModuleBalanceRequest.encode(message).finish();
  },
  toProtoMsg(message: ModuleBalanceRequest): ModuleBalanceRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.ModuleBalanceRequest',
      value: ModuleBalanceRequest.encode(message).finish(),
    };
  },
};
function createBaseModuleBalanceResponse(): ModuleBalanceResponse {
  return {
    coins: [],
  };
}
export const ModuleBalanceResponse = {
  typeUrl: '/osmosis.lockup.ModuleBalanceResponse',
  encode(
    message: ModuleBalanceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ModuleBalanceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseModuleBalanceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ModuleBalanceResponse {
    return {
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: ModuleBalanceResponse): JsonSafe<ModuleBalanceResponse> {
    const obj: any = {};
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ModuleBalanceResponse>): ModuleBalanceResponse {
    const message = createBaseModuleBalanceResponse();
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: ModuleBalanceResponseProtoMsg): ModuleBalanceResponse {
    return ModuleBalanceResponse.decode(message.value);
  },
  toProto(message: ModuleBalanceResponse): Uint8Array {
    return ModuleBalanceResponse.encode(message).finish();
  },
  toProtoMsg(message: ModuleBalanceResponse): ModuleBalanceResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.ModuleBalanceResponse',
      value: ModuleBalanceResponse.encode(message).finish(),
    };
  },
};
function createBaseModuleLockedAmountRequest(): ModuleLockedAmountRequest {
  return {};
}
export const ModuleLockedAmountRequest = {
  typeUrl: '/osmosis.lockup.ModuleLockedAmountRequest',
  encode(
    _: ModuleLockedAmountRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ModuleLockedAmountRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseModuleLockedAmountRequest();
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
  fromJSON(_: any): ModuleLockedAmountRequest {
    return {};
  },
  toJSON(_: ModuleLockedAmountRequest): JsonSafe<ModuleLockedAmountRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<ModuleLockedAmountRequest>,
  ): ModuleLockedAmountRequest {
    const message = createBaseModuleLockedAmountRequest();
    return message;
  },
  fromProtoMsg(
    message: ModuleLockedAmountRequestProtoMsg,
  ): ModuleLockedAmountRequest {
    return ModuleLockedAmountRequest.decode(message.value);
  },
  toProto(message: ModuleLockedAmountRequest): Uint8Array {
    return ModuleLockedAmountRequest.encode(message).finish();
  },
  toProtoMsg(
    message: ModuleLockedAmountRequest,
  ): ModuleLockedAmountRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.ModuleLockedAmountRequest',
      value: ModuleLockedAmountRequest.encode(message).finish(),
    };
  },
};
function createBaseModuleLockedAmountResponse(): ModuleLockedAmountResponse {
  return {
    coins: [],
  };
}
export const ModuleLockedAmountResponse = {
  typeUrl: '/osmosis.lockup.ModuleLockedAmountResponse',
  encode(
    message: ModuleLockedAmountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ModuleLockedAmountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseModuleLockedAmountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ModuleLockedAmountResponse {
    return {
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: ModuleLockedAmountResponse,
  ): JsonSafe<ModuleLockedAmountResponse> {
    const obj: any = {};
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<ModuleLockedAmountResponse>,
  ): ModuleLockedAmountResponse {
    const message = createBaseModuleLockedAmountResponse();
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: ModuleLockedAmountResponseProtoMsg,
  ): ModuleLockedAmountResponse {
    return ModuleLockedAmountResponse.decode(message.value);
  },
  toProto(message: ModuleLockedAmountResponse): Uint8Array {
    return ModuleLockedAmountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: ModuleLockedAmountResponse,
  ): ModuleLockedAmountResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.ModuleLockedAmountResponse',
      value: ModuleLockedAmountResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountUnlockableCoinsRequest(): AccountUnlockableCoinsRequest {
  return {
    owner: '',
  };
}
export const AccountUnlockableCoinsRequest = {
  typeUrl: '/osmosis.lockup.AccountUnlockableCoinsRequest',
  encode(
    message: AccountUnlockableCoinsRequest,
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
  ): AccountUnlockableCoinsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountUnlockableCoinsRequest();
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
  fromJSON(object: any): AccountUnlockableCoinsRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
    };
  },
  toJSON(
    message: AccountUnlockableCoinsRequest,
  ): JsonSafe<AccountUnlockableCoinsRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    return obj;
  },
  fromPartial(
    object: Partial<AccountUnlockableCoinsRequest>,
  ): AccountUnlockableCoinsRequest {
    const message = createBaseAccountUnlockableCoinsRequest();
    message.owner = object.owner ?? '';
    return message;
  },
  fromProtoMsg(
    message: AccountUnlockableCoinsRequestProtoMsg,
  ): AccountUnlockableCoinsRequest {
    return AccountUnlockableCoinsRequest.decode(message.value);
  },
  toProto(message: AccountUnlockableCoinsRequest): Uint8Array {
    return AccountUnlockableCoinsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountUnlockableCoinsRequest,
  ): AccountUnlockableCoinsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountUnlockableCoinsRequest',
      value: AccountUnlockableCoinsRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountUnlockableCoinsResponse(): AccountUnlockableCoinsResponse {
  return {
    coins: [],
  };
}
export const AccountUnlockableCoinsResponse = {
  typeUrl: '/osmosis.lockup.AccountUnlockableCoinsResponse',
  encode(
    message: AccountUnlockableCoinsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountUnlockableCoinsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountUnlockableCoinsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountUnlockableCoinsResponse {
    return {
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountUnlockableCoinsResponse,
  ): JsonSafe<AccountUnlockableCoinsResponse> {
    const obj: any = {};
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountUnlockableCoinsResponse>,
  ): AccountUnlockableCoinsResponse {
    const message = createBaseAccountUnlockableCoinsResponse();
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountUnlockableCoinsResponseProtoMsg,
  ): AccountUnlockableCoinsResponse {
    return AccountUnlockableCoinsResponse.decode(message.value);
  },
  toProto(message: AccountUnlockableCoinsResponse): Uint8Array {
    return AccountUnlockableCoinsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountUnlockableCoinsResponse,
  ): AccountUnlockableCoinsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountUnlockableCoinsResponse',
      value: AccountUnlockableCoinsResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountUnlockingCoinsRequest(): AccountUnlockingCoinsRequest {
  return {
    owner: '',
  };
}
export const AccountUnlockingCoinsRequest = {
  typeUrl: '/osmosis.lockup.AccountUnlockingCoinsRequest',
  encode(
    message: AccountUnlockingCoinsRequest,
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
  ): AccountUnlockingCoinsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountUnlockingCoinsRequest();
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
  fromJSON(object: any): AccountUnlockingCoinsRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
    };
  },
  toJSON(
    message: AccountUnlockingCoinsRequest,
  ): JsonSafe<AccountUnlockingCoinsRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    return obj;
  },
  fromPartial(
    object: Partial<AccountUnlockingCoinsRequest>,
  ): AccountUnlockingCoinsRequest {
    const message = createBaseAccountUnlockingCoinsRequest();
    message.owner = object.owner ?? '';
    return message;
  },
  fromProtoMsg(
    message: AccountUnlockingCoinsRequestProtoMsg,
  ): AccountUnlockingCoinsRequest {
    return AccountUnlockingCoinsRequest.decode(message.value);
  },
  toProto(message: AccountUnlockingCoinsRequest): Uint8Array {
    return AccountUnlockingCoinsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountUnlockingCoinsRequest,
  ): AccountUnlockingCoinsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountUnlockingCoinsRequest',
      value: AccountUnlockingCoinsRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountUnlockingCoinsResponse(): AccountUnlockingCoinsResponse {
  return {
    coins: [],
  };
}
export const AccountUnlockingCoinsResponse = {
  typeUrl: '/osmosis.lockup.AccountUnlockingCoinsResponse',
  encode(
    message: AccountUnlockingCoinsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountUnlockingCoinsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountUnlockingCoinsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountUnlockingCoinsResponse {
    return {
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountUnlockingCoinsResponse,
  ): JsonSafe<AccountUnlockingCoinsResponse> {
    const obj: any = {};
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountUnlockingCoinsResponse>,
  ): AccountUnlockingCoinsResponse {
    const message = createBaseAccountUnlockingCoinsResponse();
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountUnlockingCoinsResponseProtoMsg,
  ): AccountUnlockingCoinsResponse {
    return AccountUnlockingCoinsResponse.decode(message.value);
  },
  toProto(message: AccountUnlockingCoinsResponse): Uint8Array {
    return AccountUnlockingCoinsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountUnlockingCoinsResponse,
  ): AccountUnlockingCoinsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountUnlockingCoinsResponse',
      value: AccountUnlockingCoinsResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedCoinsRequest(): AccountLockedCoinsRequest {
  return {
    owner: '',
  };
}
export const AccountLockedCoinsRequest = {
  typeUrl: '/osmosis.lockup.AccountLockedCoinsRequest',
  encode(
    message: AccountLockedCoinsRequest,
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
  ): AccountLockedCoinsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedCoinsRequest();
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
  fromJSON(object: any): AccountLockedCoinsRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
    };
  },
  toJSON(
    message: AccountLockedCoinsRequest,
  ): JsonSafe<AccountLockedCoinsRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedCoinsRequest>,
  ): AccountLockedCoinsRequest {
    const message = createBaseAccountLockedCoinsRequest();
    message.owner = object.owner ?? '';
    return message;
  },
  fromProtoMsg(
    message: AccountLockedCoinsRequestProtoMsg,
  ): AccountLockedCoinsRequest {
    return AccountLockedCoinsRequest.decode(message.value);
  },
  toProto(message: AccountLockedCoinsRequest): Uint8Array {
    return AccountLockedCoinsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedCoinsRequest,
  ): AccountLockedCoinsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedCoinsRequest',
      value: AccountLockedCoinsRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedCoinsResponse(): AccountLockedCoinsResponse {
  return {
    coins: [],
  };
}
export const AccountLockedCoinsResponse = {
  typeUrl: '/osmosis.lockup.AccountLockedCoinsResponse',
  encode(
    message: AccountLockedCoinsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedCoinsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedCoinsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedCoinsResponse {
    return {
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountLockedCoinsResponse,
  ): JsonSafe<AccountLockedCoinsResponse> {
    const obj: any = {};
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedCoinsResponse>,
  ): AccountLockedCoinsResponse {
    const message = createBaseAccountLockedCoinsResponse();
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountLockedCoinsResponseProtoMsg,
  ): AccountLockedCoinsResponse {
    return AccountLockedCoinsResponse.decode(message.value);
  },
  toProto(message: AccountLockedCoinsResponse): Uint8Array {
    return AccountLockedCoinsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedCoinsResponse,
  ): AccountLockedCoinsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedCoinsResponse',
      value: AccountLockedCoinsResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedPastTimeRequest(): AccountLockedPastTimeRequest {
  return {
    owner: '',
    timestamp: Timestamp.fromPartial({}),
  };
}
export const AccountLockedPastTimeRequest = {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeRequest',
  encode(
    message: AccountLockedPastTimeRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.timestamp !== undefined) {
      Timestamp.encode(message.timestamp, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedPastTimeRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedPastTimeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.timestamp = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedPastTimeRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      timestamp: isSet(object.timestamp)
        ? fromJsonTimestamp(object.timestamp)
        : undefined,
    };
  },
  toJSON(
    message: AccountLockedPastTimeRequest,
  ): JsonSafe<AccountLockedPastTimeRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.timestamp !== undefined &&
      (obj.timestamp = fromTimestamp(message.timestamp).toISOString());
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedPastTimeRequest>,
  ): AccountLockedPastTimeRequest {
    const message = createBaseAccountLockedPastTimeRequest();
    message.owner = object.owner ?? '';
    message.timestamp =
      object.timestamp !== undefined && object.timestamp !== null
        ? Timestamp.fromPartial(object.timestamp)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AccountLockedPastTimeRequestProtoMsg,
  ): AccountLockedPastTimeRequest {
    return AccountLockedPastTimeRequest.decode(message.value);
  },
  toProto(message: AccountLockedPastTimeRequest): Uint8Array {
    return AccountLockedPastTimeRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedPastTimeRequest,
  ): AccountLockedPastTimeRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedPastTimeRequest',
      value: AccountLockedPastTimeRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedPastTimeResponse(): AccountLockedPastTimeResponse {
  return {
    locks: [],
  };
}
export const AccountLockedPastTimeResponse = {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeResponse',
  encode(
    message: AccountLockedPastTimeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.locks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedPastTimeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedPastTimeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.locks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedPastTimeResponse {
    return {
      locks: Array.isArray(object?.locks)
        ? object.locks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountLockedPastTimeResponse,
  ): JsonSafe<AccountLockedPastTimeResponse> {
    const obj: any = {};
    if (message.locks) {
      obj.locks = message.locks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.locks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedPastTimeResponse>,
  ): AccountLockedPastTimeResponse {
    const message = createBaseAccountLockedPastTimeResponse();
    message.locks = object.locks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountLockedPastTimeResponseProtoMsg,
  ): AccountLockedPastTimeResponse {
    return AccountLockedPastTimeResponse.decode(message.value);
  },
  toProto(message: AccountLockedPastTimeResponse): Uint8Array {
    return AccountLockedPastTimeResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedPastTimeResponse,
  ): AccountLockedPastTimeResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedPastTimeResponse',
      value: AccountLockedPastTimeResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedPastTimeNotUnlockingOnlyRequest(): AccountLockedPastTimeNotUnlockingOnlyRequest {
  return {
    owner: '',
    timestamp: Timestamp.fromPartial({}),
  };
}
export const AccountLockedPastTimeNotUnlockingOnlyRequest = {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeNotUnlockingOnlyRequest',
  encode(
    message: AccountLockedPastTimeNotUnlockingOnlyRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.timestamp !== undefined) {
      Timestamp.encode(message.timestamp, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedPastTimeNotUnlockingOnlyRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedPastTimeNotUnlockingOnlyRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.timestamp = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedPastTimeNotUnlockingOnlyRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      timestamp: isSet(object.timestamp)
        ? fromJsonTimestamp(object.timestamp)
        : undefined,
    };
  },
  toJSON(
    message: AccountLockedPastTimeNotUnlockingOnlyRequest,
  ): JsonSafe<AccountLockedPastTimeNotUnlockingOnlyRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.timestamp !== undefined &&
      (obj.timestamp = fromTimestamp(message.timestamp).toISOString());
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedPastTimeNotUnlockingOnlyRequest>,
  ): AccountLockedPastTimeNotUnlockingOnlyRequest {
    const message = createBaseAccountLockedPastTimeNotUnlockingOnlyRequest();
    message.owner = object.owner ?? '';
    message.timestamp =
      object.timestamp !== undefined && object.timestamp !== null
        ? Timestamp.fromPartial(object.timestamp)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AccountLockedPastTimeNotUnlockingOnlyRequestProtoMsg,
  ): AccountLockedPastTimeNotUnlockingOnlyRequest {
    return AccountLockedPastTimeNotUnlockingOnlyRequest.decode(message.value);
  },
  toProto(message: AccountLockedPastTimeNotUnlockingOnlyRequest): Uint8Array {
    return AccountLockedPastTimeNotUnlockingOnlyRequest.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: AccountLockedPastTimeNotUnlockingOnlyRequest,
  ): AccountLockedPastTimeNotUnlockingOnlyRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedPastTimeNotUnlockingOnlyRequest',
      value:
        AccountLockedPastTimeNotUnlockingOnlyRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedPastTimeNotUnlockingOnlyResponse(): AccountLockedPastTimeNotUnlockingOnlyResponse {
  return {
    locks: [],
  };
}
export const AccountLockedPastTimeNotUnlockingOnlyResponse = {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeNotUnlockingOnlyResponse',
  encode(
    message: AccountLockedPastTimeNotUnlockingOnlyResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.locks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedPastTimeNotUnlockingOnlyResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedPastTimeNotUnlockingOnlyResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.locks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedPastTimeNotUnlockingOnlyResponse {
    return {
      locks: Array.isArray(object?.locks)
        ? object.locks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountLockedPastTimeNotUnlockingOnlyResponse,
  ): JsonSafe<AccountLockedPastTimeNotUnlockingOnlyResponse> {
    const obj: any = {};
    if (message.locks) {
      obj.locks = message.locks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.locks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedPastTimeNotUnlockingOnlyResponse>,
  ): AccountLockedPastTimeNotUnlockingOnlyResponse {
    const message = createBaseAccountLockedPastTimeNotUnlockingOnlyResponse();
    message.locks = object.locks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountLockedPastTimeNotUnlockingOnlyResponseProtoMsg,
  ): AccountLockedPastTimeNotUnlockingOnlyResponse {
    return AccountLockedPastTimeNotUnlockingOnlyResponse.decode(message.value);
  },
  toProto(message: AccountLockedPastTimeNotUnlockingOnlyResponse): Uint8Array {
    return AccountLockedPastTimeNotUnlockingOnlyResponse.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: AccountLockedPastTimeNotUnlockingOnlyResponse,
  ): AccountLockedPastTimeNotUnlockingOnlyResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedPastTimeNotUnlockingOnlyResponse',
      value:
        AccountLockedPastTimeNotUnlockingOnlyResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountUnlockedBeforeTimeRequest(): AccountUnlockedBeforeTimeRequest {
  return {
    owner: '',
    timestamp: Timestamp.fromPartial({}),
  };
}
export const AccountUnlockedBeforeTimeRequest = {
  typeUrl: '/osmosis.lockup.AccountUnlockedBeforeTimeRequest',
  encode(
    message: AccountUnlockedBeforeTimeRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.timestamp !== undefined) {
      Timestamp.encode(message.timestamp, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountUnlockedBeforeTimeRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountUnlockedBeforeTimeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.timestamp = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountUnlockedBeforeTimeRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      timestamp: isSet(object.timestamp)
        ? fromJsonTimestamp(object.timestamp)
        : undefined,
    };
  },
  toJSON(
    message: AccountUnlockedBeforeTimeRequest,
  ): JsonSafe<AccountUnlockedBeforeTimeRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.timestamp !== undefined &&
      (obj.timestamp = fromTimestamp(message.timestamp).toISOString());
    return obj;
  },
  fromPartial(
    object: Partial<AccountUnlockedBeforeTimeRequest>,
  ): AccountUnlockedBeforeTimeRequest {
    const message = createBaseAccountUnlockedBeforeTimeRequest();
    message.owner = object.owner ?? '';
    message.timestamp =
      object.timestamp !== undefined && object.timestamp !== null
        ? Timestamp.fromPartial(object.timestamp)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AccountUnlockedBeforeTimeRequestProtoMsg,
  ): AccountUnlockedBeforeTimeRequest {
    return AccountUnlockedBeforeTimeRequest.decode(message.value);
  },
  toProto(message: AccountUnlockedBeforeTimeRequest): Uint8Array {
    return AccountUnlockedBeforeTimeRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountUnlockedBeforeTimeRequest,
  ): AccountUnlockedBeforeTimeRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountUnlockedBeforeTimeRequest',
      value: AccountUnlockedBeforeTimeRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountUnlockedBeforeTimeResponse(): AccountUnlockedBeforeTimeResponse {
  return {
    locks: [],
  };
}
export const AccountUnlockedBeforeTimeResponse = {
  typeUrl: '/osmosis.lockup.AccountUnlockedBeforeTimeResponse',
  encode(
    message: AccountUnlockedBeforeTimeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.locks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountUnlockedBeforeTimeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountUnlockedBeforeTimeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.locks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountUnlockedBeforeTimeResponse {
    return {
      locks: Array.isArray(object?.locks)
        ? object.locks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountUnlockedBeforeTimeResponse,
  ): JsonSafe<AccountUnlockedBeforeTimeResponse> {
    const obj: any = {};
    if (message.locks) {
      obj.locks = message.locks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.locks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountUnlockedBeforeTimeResponse>,
  ): AccountUnlockedBeforeTimeResponse {
    const message = createBaseAccountUnlockedBeforeTimeResponse();
    message.locks = object.locks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountUnlockedBeforeTimeResponseProtoMsg,
  ): AccountUnlockedBeforeTimeResponse {
    return AccountUnlockedBeforeTimeResponse.decode(message.value);
  },
  toProto(message: AccountUnlockedBeforeTimeResponse): Uint8Array {
    return AccountUnlockedBeforeTimeResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountUnlockedBeforeTimeResponse,
  ): AccountUnlockedBeforeTimeResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountUnlockedBeforeTimeResponse',
      value: AccountUnlockedBeforeTimeResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedPastTimeDenomRequest(): AccountLockedPastTimeDenomRequest {
  return {
    owner: '',
    timestamp: Timestamp.fromPartial({}),
    denom: '',
  };
}
export const AccountLockedPastTimeDenomRequest = {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeDenomRequest',
  encode(
    message: AccountLockedPastTimeDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.timestamp !== undefined) {
      Timestamp.encode(message.timestamp, writer.uint32(18).fork()).ldelim();
    }
    if (message.denom !== '') {
      writer.uint32(26).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedPastTimeDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedPastTimeDenomRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.timestamp = Timestamp.decode(reader, reader.uint32());
          break;
        case 3:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedPastTimeDenomRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      timestamp: isSet(object.timestamp)
        ? fromJsonTimestamp(object.timestamp)
        : undefined,
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: AccountLockedPastTimeDenomRequest,
  ): JsonSafe<AccountLockedPastTimeDenomRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.timestamp !== undefined &&
      (obj.timestamp = fromTimestamp(message.timestamp).toISOString());
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedPastTimeDenomRequest>,
  ): AccountLockedPastTimeDenomRequest {
    const message = createBaseAccountLockedPastTimeDenomRequest();
    message.owner = object.owner ?? '';
    message.timestamp =
      object.timestamp !== undefined && object.timestamp !== null
        ? Timestamp.fromPartial(object.timestamp)
        : undefined;
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: AccountLockedPastTimeDenomRequestProtoMsg,
  ): AccountLockedPastTimeDenomRequest {
    return AccountLockedPastTimeDenomRequest.decode(message.value);
  },
  toProto(message: AccountLockedPastTimeDenomRequest): Uint8Array {
    return AccountLockedPastTimeDenomRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedPastTimeDenomRequest,
  ): AccountLockedPastTimeDenomRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedPastTimeDenomRequest',
      value: AccountLockedPastTimeDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedPastTimeDenomResponse(): AccountLockedPastTimeDenomResponse {
  return {
    locks: [],
  };
}
export const AccountLockedPastTimeDenomResponse = {
  typeUrl: '/osmosis.lockup.AccountLockedPastTimeDenomResponse',
  encode(
    message: AccountLockedPastTimeDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.locks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedPastTimeDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedPastTimeDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.locks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedPastTimeDenomResponse {
    return {
      locks: Array.isArray(object?.locks)
        ? object.locks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountLockedPastTimeDenomResponse,
  ): JsonSafe<AccountLockedPastTimeDenomResponse> {
    const obj: any = {};
    if (message.locks) {
      obj.locks = message.locks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.locks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedPastTimeDenomResponse>,
  ): AccountLockedPastTimeDenomResponse {
    const message = createBaseAccountLockedPastTimeDenomResponse();
    message.locks = object.locks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountLockedPastTimeDenomResponseProtoMsg,
  ): AccountLockedPastTimeDenomResponse {
    return AccountLockedPastTimeDenomResponse.decode(message.value);
  },
  toProto(message: AccountLockedPastTimeDenomResponse): Uint8Array {
    return AccountLockedPastTimeDenomResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedPastTimeDenomResponse,
  ): AccountLockedPastTimeDenomResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedPastTimeDenomResponse',
      value: AccountLockedPastTimeDenomResponse.encode(message).finish(),
    };
  },
};
function createBaseLockedDenomRequest(): LockedDenomRequest {
  return {
    denom: '',
    duration: Duration.fromPartial({}),
  };
}
export const LockedDenomRequest = {
  typeUrl: '/osmosis.lockup.LockedDenomRequest',
  encode(
    message: LockedDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): LockedDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLockedDenomRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        case 2:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): LockedDenomRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
    };
  },
  toJSON(message: LockedDenomRequest): JsonSafe<LockedDenomRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<LockedDenomRequest>): LockedDenomRequest {
    const message = createBaseLockedDenomRequest();
    message.denom = object.denom ?? '';
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    return message;
  },
  fromProtoMsg(message: LockedDenomRequestProtoMsg): LockedDenomRequest {
    return LockedDenomRequest.decode(message.value);
  },
  toProto(message: LockedDenomRequest): Uint8Array {
    return LockedDenomRequest.encode(message).finish();
  },
  toProtoMsg(message: LockedDenomRequest): LockedDenomRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.LockedDenomRequest',
      value: LockedDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseLockedDenomResponse(): LockedDenomResponse {
  return {
    amount: '',
  };
}
export const LockedDenomResponse = {
  typeUrl: '/osmosis.lockup.LockedDenomResponse',
  encode(
    message: LockedDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.amount !== '') {
      writer.uint32(10).string(message.amount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): LockedDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLockedDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): LockedDenomResponse {
    return {
      amount: isSet(object.amount) ? String(object.amount) : '',
    };
  },
  toJSON(message: LockedDenomResponse): JsonSafe<LockedDenomResponse> {
    const obj: any = {};
    message.amount !== undefined && (obj.amount = message.amount);
    return obj;
  },
  fromPartial(object: Partial<LockedDenomResponse>): LockedDenomResponse {
    const message = createBaseLockedDenomResponse();
    message.amount = object.amount ?? '';
    return message;
  },
  fromProtoMsg(message: LockedDenomResponseProtoMsg): LockedDenomResponse {
    return LockedDenomResponse.decode(message.value);
  },
  toProto(message: LockedDenomResponse): Uint8Array {
    return LockedDenomResponse.encode(message).finish();
  },
  toProtoMsg(message: LockedDenomResponse): LockedDenomResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.LockedDenomResponse',
      value: LockedDenomResponse.encode(message).finish(),
    };
  },
};
function createBaseLockedRequest(): LockedRequest {
  return {
    lockId: BigInt(0),
  };
}
export const LockedRequest = {
  typeUrl: '/osmosis.lockup.LockedRequest',
  encode(
    message: LockedRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.lockId !== BigInt(0)) {
      writer.uint32(8).uint64(message.lockId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): LockedRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLockedRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lockId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): LockedRequest {
    return {
      lockId: isSet(object.lockId)
        ? BigInt(object.lockId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: LockedRequest): JsonSafe<LockedRequest> {
    const obj: any = {};
    message.lockId !== undefined &&
      (obj.lockId = (message.lockId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<LockedRequest>): LockedRequest {
    const message = createBaseLockedRequest();
    message.lockId =
      object.lockId !== undefined && object.lockId !== null
        ? BigInt(object.lockId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: LockedRequestProtoMsg): LockedRequest {
    return LockedRequest.decode(message.value);
  },
  toProto(message: LockedRequest): Uint8Array {
    return LockedRequest.encode(message).finish();
  },
  toProtoMsg(message: LockedRequest): LockedRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.LockedRequest',
      value: LockedRequest.encode(message).finish(),
    };
  },
};
function createBaseLockedResponse(): LockedResponse {
  return {
    lock: undefined,
  };
}
export const LockedResponse = {
  typeUrl: '/osmosis.lockup.LockedResponse',
  encode(
    message: LockedResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.lock !== undefined) {
      PeriodLock.encode(message.lock, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): LockedResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLockedResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lock = PeriodLock.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): LockedResponse {
    return {
      lock: isSet(object.lock) ? PeriodLock.fromJSON(object.lock) : undefined,
    };
  },
  toJSON(message: LockedResponse): JsonSafe<LockedResponse> {
    const obj: any = {};
    message.lock !== undefined &&
      (obj.lock = message.lock ? PeriodLock.toJSON(message.lock) : undefined);
    return obj;
  },
  fromPartial(object: Partial<LockedResponse>): LockedResponse {
    const message = createBaseLockedResponse();
    message.lock =
      object.lock !== undefined && object.lock !== null
        ? PeriodLock.fromPartial(object.lock)
        : undefined;
    return message;
  },
  fromProtoMsg(message: LockedResponseProtoMsg): LockedResponse {
    return LockedResponse.decode(message.value);
  },
  toProto(message: LockedResponse): Uint8Array {
    return LockedResponse.encode(message).finish();
  },
  toProtoMsg(message: LockedResponse): LockedResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.LockedResponse',
      value: LockedResponse.encode(message).finish(),
    };
  },
};
function createBaseSyntheticLockupsByLockupIDRequest(): SyntheticLockupsByLockupIDRequest {
  return {
    lockId: BigInt(0),
  };
}
export const SyntheticLockupsByLockupIDRequest = {
  typeUrl: '/osmosis.lockup.SyntheticLockupsByLockupIDRequest',
  encode(
    message: SyntheticLockupsByLockupIDRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.lockId !== BigInt(0)) {
      writer.uint32(8).uint64(message.lockId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SyntheticLockupsByLockupIDRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSyntheticLockupsByLockupIDRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lockId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SyntheticLockupsByLockupIDRequest {
    return {
      lockId: isSet(object.lockId)
        ? BigInt(object.lockId.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: SyntheticLockupsByLockupIDRequest,
  ): JsonSafe<SyntheticLockupsByLockupIDRequest> {
    const obj: any = {};
    message.lockId !== undefined &&
      (obj.lockId = (message.lockId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<SyntheticLockupsByLockupIDRequest>,
  ): SyntheticLockupsByLockupIDRequest {
    const message = createBaseSyntheticLockupsByLockupIDRequest();
    message.lockId =
      object.lockId !== undefined && object.lockId !== null
        ? BigInt(object.lockId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: SyntheticLockupsByLockupIDRequestProtoMsg,
  ): SyntheticLockupsByLockupIDRequest {
    return SyntheticLockupsByLockupIDRequest.decode(message.value);
  },
  toProto(message: SyntheticLockupsByLockupIDRequest): Uint8Array {
    return SyntheticLockupsByLockupIDRequest.encode(message).finish();
  },
  toProtoMsg(
    message: SyntheticLockupsByLockupIDRequest,
  ): SyntheticLockupsByLockupIDRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.SyntheticLockupsByLockupIDRequest',
      value: SyntheticLockupsByLockupIDRequest.encode(message).finish(),
    };
  },
};
function createBaseSyntheticLockupsByLockupIDResponse(): SyntheticLockupsByLockupIDResponse {
  return {
    syntheticLocks: [],
  };
}
export const SyntheticLockupsByLockupIDResponse = {
  typeUrl: '/osmosis.lockup.SyntheticLockupsByLockupIDResponse',
  encode(
    message: SyntheticLockupsByLockupIDResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.syntheticLocks) {
      SyntheticLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SyntheticLockupsByLockupIDResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSyntheticLockupsByLockupIDResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.syntheticLocks.push(
            SyntheticLock.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SyntheticLockupsByLockupIDResponse {
    return {
      syntheticLocks: Array.isArray(object?.syntheticLocks)
        ? object.syntheticLocks.map((e: any) => SyntheticLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: SyntheticLockupsByLockupIDResponse,
  ): JsonSafe<SyntheticLockupsByLockupIDResponse> {
    const obj: any = {};
    if (message.syntheticLocks) {
      obj.syntheticLocks = message.syntheticLocks.map(e =>
        e ? SyntheticLock.toJSON(e) : undefined,
      );
    } else {
      obj.syntheticLocks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<SyntheticLockupsByLockupIDResponse>,
  ): SyntheticLockupsByLockupIDResponse {
    const message = createBaseSyntheticLockupsByLockupIDResponse();
    message.syntheticLocks =
      object.syntheticLocks?.map(e => SyntheticLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: SyntheticLockupsByLockupIDResponseProtoMsg,
  ): SyntheticLockupsByLockupIDResponse {
    return SyntheticLockupsByLockupIDResponse.decode(message.value);
  },
  toProto(message: SyntheticLockupsByLockupIDResponse): Uint8Array {
    return SyntheticLockupsByLockupIDResponse.encode(message).finish();
  },
  toProtoMsg(
    message: SyntheticLockupsByLockupIDResponse,
  ): SyntheticLockupsByLockupIDResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.SyntheticLockupsByLockupIDResponse',
      value: SyntheticLockupsByLockupIDResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedLongerDurationRequest(): AccountLockedLongerDurationRequest {
  return {
    owner: '',
    duration: Duration.fromPartial({}),
  };
}
export const AccountLockedLongerDurationRequest = {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationRequest',
  encode(
    message: AccountLockedLongerDurationRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedLongerDurationRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedLongerDurationRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedLongerDurationRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
    };
  },
  toJSON(
    message: AccountLockedLongerDurationRequest,
  ): JsonSafe<AccountLockedLongerDurationRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedLongerDurationRequest>,
  ): AccountLockedLongerDurationRequest {
    const message = createBaseAccountLockedLongerDurationRequest();
    message.owner = object.owner ?? '';
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AccountLockedLongerDurationRequestProtoMsg,
  ): AccountLockedLongerDurationRequest {
    return AccountLockedLongerDurationRequest.decode(message.value);
  },
  toProto(message: AccountLockedLongerDurationRequest): Uint8Array {
    return AccountLockedLongerDurationRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedLongerDurationRequest,
  ): AccountLockedLongerDurationRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedLongerDurationRequest',
      value: AccountLockedLongerDurationRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedLongerDurationResponse(): AccountLockedLongerDurationResponse {
  return {
    locks: [],
  };
}
export const AccountLockedLongerDurationResponse = {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationResponse',
  encode(
    message: AccountLockedLongerDurationResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.locks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedLongerDurationResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedLongerDurationResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.locks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedLongerDurationResponse {
    return {
      locks: Array.isArray(object?.locks)
        ? object.locks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountLockedLongerDurationResponse,
  ): JsonSafe<AccountLockedLongerDurationResponse> {
    const obj: any = {};
    if (message.locks) {
      obj.locks = message.locks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.locks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedLongerDurationResponse>,
  ): AccountLockedLongerDurationResponse {
    const message = createBaseAccountLockedLongerDurationResponse();
    message.locks = object.locks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountLockedLongerDurationResponseProtoMsg,
  ): AccountLockedLongerDurationResponse {
    return AccountLockedLongerDurationResponse.decode(message.value);
  },
  toProto(message: AccountLockedLongerDurationResponse): Uint8Array {
    return AccountLockedLongerDurationResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedLongerDurationResponse,
  ): AccountLockedLongerDurationResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedLongerDurationResponse',
      value: AccountLockedLongerDurationResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedDurationRequest(): AccountLockedDurationRequest {
  return {
    owner: '',
    duration: Duration.fromPartial({}),
  };
}
export const AccountLockedDurationRequest = {
  typeUrl: '/osmosis.lockup.AccountLockedDurationRequest',
  encode(
    message: AccountLockedDurationRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedDurationRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedDurationRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedDurationRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
    };
  },
  toJSON(
    message: AccountLockedDurationRequest,
  ): JsonSafe<AccountLockedDurationRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedDurationRequest>,
  ): AccountLockedDurationRequest {
    const message = createBaseAccountLockedDurationRequest();
    message.owner = object.owner ?? '';
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AccountLockedDurationRequestProtoMsg,
  ): AccountLockedDurationRequest {
    return AccountLockedDurationRequest.decode(message.value);
  },
  toProto(message: AccountLockedDurationRequest): Uint8Array {
    return AccountLockedDurationRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedDurationRequest,
  ): AccountLockedDurationRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedDurationRequest',
      value: AccountLockedDurationRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedDurationResponse(): AccountLockedDurationResponse {
  return {
    locks: [],
  };
}
export const AccountLockedDurationResponse = {
  typeUrl: '/osmosis.lockup.AccountLockedDurationResponse',
  encode(
    message: AccountLockedDurationResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.locks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedDurationResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedDurationResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.locks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedDurationResponse {
    return {
      locks: Array.isArray(object?.locks)
        ? object.locks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountLockedDurationResponse,
  ): JsonSafe<AccountLockedDurationResponse> {
    const obj: any = {};
    if (message.locks) {
      obj.locks = message.locks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.locks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedDurationResponse>,
  ): AccountLockedDurationResponse {
    const message = createBaseAccountLockedDurationResponse();
    message.locks = object.locks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountLockedDurationResponseProtoMsg,
  ): AccountLockedDurationResponse {
    return AccountLockedDurationResponse.decode(message.value);
  },
  toProto(message: AccountLockedDurationResponse): Uint8Array {
    return AccountLockedDurationResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedDurationResponse,
  ): AccountLockedDurationResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedDurationResponse',
      value: AccountLockedDurationResponse.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedLongerDurationNotUnlockingOnlyRequest(): AccountLockedLongerDurationNotUnlockingOnlyRequest {
  return {
    owner: '',
    duration: Duration.fromPartial({}),
  };
}
export const AccountLockedLongerDurationNotUnlockingOnlyRequest = {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationNotUnlockingOnlyRequest',
  encode(
    message: AccountLockedLongerDurationNotUnlockingOnlyRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedLongerDurationNotUnlockingOnlyRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message =
      createBaseAccountLockedLongerDurationNotUnlockingOnlyRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedLongerDurationNotUnlockingOnlyRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
    };
  },
  toJSON(
    message: AccountLockedLongerDurationNotUnlockingOnlyRequest,
  ): JsonSafe<AccountLockedLongerDurationNotUnlockingOnlyRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedLongerDurationNotUnlockingOnlyRequest>,
  ): AccountLockedLongerDurationNotUnlockingOnlyRequest {
    const message =
      createBaseAccountLockedLongerDurationNotUnlockingOnlyRequest();
    message.owner = object.owner ?? '';
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AccountLockedLongerDurationNotUnlockingOnlyRequestProtoMsg,
  ): AccountLockedLongerDurationNotUnlockingOnlyRequest {
    return AccountLockedLongerDurationNotUnlockingOnlyRequest.decode(
      message.value,
    );
  },
  toProto(
    message: AccountLockedLongerDurationNotUnlockingOnlyRequest,
  ): Uint8Array {
    return AccountLockedLongerDurationNotUnlockingOnlyRequest.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: AccountLockedLongerDurationNotUnlockingOnlyRequest,
  ): AccountLockedLongerDurationNotUnlockingOnlyRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.lockup.AccountLockedLongerDurationNotUnlockingOnlyRequest',
      value:
        AccountLockedLongerDurationNotUnlockingOnlyRequest.encode(
          message,
        ).finish(),
    };
  },
};
function createBaseAccountLockedLongerDurationNotUnlockingOnlyResponse(): AccountLockedLongerDurationNotUnlockingOnlyResponse {
  return {
    locks: [],
  };
}
export const AccountLockedLongerDurationNotUnlockingOnlyResponse = {
  typeUrl:
    '/osmosis.lockup.AccountLockedLongerDurationNotUnlockingOnlyResponse',
  encode(
    message: AccountLockedLongerDurationNotUnlockingOnlyResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.locks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedLongerDurationNotUnlockingOnlyResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message =
      createBaseAccountLockedLongerDurationNotUnlockingOnlyResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.locks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedLongerDurationNotUnlockingOnlyResponse {
    return {
      locks: Array.isArray(object?.locks)
        ? object.locks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountLockedLongerDurationNotUnlockingOnlyResponse,
  ): JsonSafe<AccountLockedLongerDurationNotUnlockingOnlyResponse> {
    const obj: any = {};
    if (message.locks) {
      obj.locks = message.locks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.locks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedLongerDurationNotUnlockingOnlyResponse>,
  ): AccountLockedLongerDurationNotUnlockingOnlyResponse {
    const message =
      createBaseAccountLockedLongerDurationNotUnlockingOnlyResponse();
    message.locks = object.locks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountLockedLongerDurationNotUnlockingOnlyResponseProtoMsg,
  ): AccountLockedLongerDurationNotUnlockingOnlyResponse {
    return AccountLockedLongerDurationNotUnlockingOnlyResponse.decode(
      message.value,
    );
  },
  toProto(
    message: AccountLockedLongerDurationNotUnlockingOnlyResponse,
  ): Uint8Array {
    return AccountLockedLongerDurationNotUnlockingOnlyResponse.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: AccountLockedLongerDurationNotUnlockingOnlyResponse,
  ): AccountLockedLongerDurationNotUnlockingOnlyResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.lockup.AccountLockedLongerDurationNotUnlockingOnlyResponse',
      value:
        AccountLockedLongerDurationNotUnlockingOnlyResponse.encode(
          message,
        ).finish(),
    };
  },
};
function createBaseAccountLockedLongerDurationDenomRequest(): AccountLockedLongerDurationDenomRequest {
  return {
    owner: '',
    duration: Duration.fromPartial({}),
    denom: '',
  };
}
export const AccountLockedLongerDurationDenomRequest = {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationDenomRequest',
  encode(
    message: AccountLockedLongerDurationDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(18).fork()).ldelim();
    }
    if (message.denom !== '') {
      writer.uint32(26).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedLongerDurationDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedLongerDurationDenomRequest();
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
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedLongerDurationDenomRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: AccountLockedLongerDurationDenomRequest,
  ): JsonSafe<AccountLockedLongerDurationDenomRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedLongerDurationDenomRequest>,
  ): AccountLockedLongerDurationDenomRequest {
    const message = createBaseAccountLockedLongerDurationDenomRequest();
    message.owner = object.owner ?? '';
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: AccountLockedLongerDurationDenomRequestProtoMsg,
  ): AccountLockedLongerDurationDenomRequest {
    return AccountLockedLongerDurationDenomRequest.decode(message.value);
  },
  toProto(message: AccountLockedLongerDurationDenomRequest): Uint8Array {
    return AccountLockedLongerDurationDenomRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedLongerDurationDenomRequest,
  ): AccountLockedLongerDurationDenomRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedLongerDurationDenomRequest',
      value: AccountLockedLongerDurationDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseAccountLockedLongerDurationDenomResponse(): AccountLockedLongerDurationDenomResponse {
  return {
    locks: [],
  };
}
export const AccountLockedLongerDurationDenomResponse = {
  typeUrl: '/osmosis.lockup.AccountLockedLongerDurationDenomResponse',
  encode(
    message: AccountLockedLongerDurationDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.locks) {
      PeriodLock.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AccountLockedLongerDurationDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAccountLockedLongerDurationDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.locks.push(PeriodLock.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AccountLockedLongerDurationDenomResponse {
    return {
      locks: Array.isArray(object?.locks)
        ? object.locks.map((e: any) => PeriodLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: AccountLockedLongerDurationDenomResponse,
  ): JsonSafe<AccountLockedLongerDurationDenomResponse> {
    const obj: any = {};
    if (message.locks) {
      obj.locks = message.locks.map(e =>
        e ? PeriodLock.toJSON(e) : undefined,
      );
    } else {
      obj.locks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<AccountLockedLongerDurationDenomResponse>,
  ): AccountLockedLongerDurationDenomResponse {
    const message = createBaseAccountLockedLongerDurationDenomResponse();
    message.locks = object.locks?.map(e => PeriodLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: AccountLockedLongerDurationDenomResponseProtoMsg,
  ): AccountLockedLongerDurationDenomResponse {
    return AccountLockedLongerDurationDenomResponse.decode(message.value);
  },
  toProto(message: AccountLockedLongerDurationDenomResponse): Uint8Array {
    return AccountLockedLongerDurationDenomResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AccountLockedLongerDurationDenomResponse,
  ): AccountLockedLongerDurationDenomResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.AccountLockedLongerDurationDenomResponse',
      value: AccountLockedLongerDurationDenomResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
export const QueryParamsRequest = {
  typeUrl: '/osmosis.lockup.QueryParamsRequest',
  encode(
    _: QueryParamsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryParamsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsRequest();
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
  fromJSON(_: any): QueryParamsRequest {
    return {};
  },
  toJSON(_: QueryParamsRequest): JsonSafe<QueryParamsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryParamsRequest>): QueryParamsRequest {
    const message = createBaseQueryParamsRequest();
    return message;
  },
  fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest {
    return QueryParamsRequest.decode(message.value);
  },
  toProto(message: QueryParamsRequest): Uint8Array {
    return QueryParamsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.QueryParamsRequest',
      value: QueryParamsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsResponse(): QueryParamsResponse {
  return {
    params: Params.fromPartial({}),
  };
}
export const QueryParamsResponse = {
  typeUrl: '/osmosis.lockup.QueryParamsResponse',
  encode(
    message: QueryParamsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryParamsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsResponse();
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
  fromJSON(object: any): QueryParamsResponse {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: QueryParamsResponse): JsonSafe<QueryParamsResponse> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryParamsResponse>): QueryParamsResponse {
    const message = createBaseQueryParamsResponse();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryParamsResponseProtoMsg): QueryParamsResponse {
    return QueryParamsResponse.decode(message.value);
  },
  toProto(message: QueryParamsResponse): Uint8Array {
    return QueryParamsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryParamsResponse): QueryParamsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
