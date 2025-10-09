//@ts-nocheck
import { Coin, type CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
import { isSet, isObject } from '../../helpers.js';
export interface QueryDenoms {}
export interface QueryDenomsProtoMsg {
  typeUrl: '/noble.forwarding.v1.QueryDenoms';
  value: Uint8Array;
}
export interface QueryDenomsSDKType {}
export interface QueryDenomsResponse {
  allowedDenoms: string[];
}
export interface QueryDenomsResponseProtoMsg {
  typeUrl: '/noble.forwarding.v1.QueryDenomsResponse';
  value: Uint8Array;
}
export interface QueryDenomsResponseSDKType {
  allowed_denoms: string[];
}
export interface QueryAddress {
  channel: string;
  recipient: string;
  fallback: string;
}
export interface QueryAddressProtoMsg {
  typeUrl: '/noble.forwarding.v1.QueryAddress';
  value: Uint8Array;
}
export interface QueryAddressSDKType {
  channel: string;
  recipient: string;
  fallback: string;
}
export interface QueryAddressResponse {
  address: string;
  exists: boolean;
}
export interface QueryAddressResponseProtoMsg {
  typeUrl: '/noble.forwarding.v1.QueryAddressResponse';
  value: Uint8Array;
}
export interface QueryAddressResponseSDKType {
  address: string;
  exists: boolean;
}
export interface QueryStats {}
export interface QueryStatsProtoMsg {
  typeUrl: '/noble.forwarding.v1.QueryStats';
  value: Uint8Array;
}
export interface QueryStatsSDKType {}
export interface QueryStatsResponse_StatsEntry {
  key: string;
  value?: Stats;
}
export interface QueryStatsResponse_StatsEntryProtoMsg {
  typeUrl: string;
  value: Uint8Array;
}
export interface QueryStatsResponse_StatsEntrySDKType {
  key: string;
  value?: StatsSDKType;
}
export interface QueryStatsResponse {
  stats: {
    [key: string]: Stats;
  };
}
export interface QueryStatsResponseProtoMsg {
  typeUrl: '/noble.forwarding.v1.QueryStatsResponse';
  value: Uint8Array;
}
export interface QueryStatsResponseSDKType {
  stats: {
    [key: string]: StatsSDKType;
  };
}
export interface QueryStatsByChannel {
  channel: string;
}
export interface QueryStatsByChannelProtoMsg {
  typeUrl: '/noble.forwarding.v1.QueryStatsByChannel';
  value: Uint8Array;
}
export interface QueryStatsByChannelSDKType {
  channel: string;
}
export interface QueryStatsByChannelResponse {
  numOfAccounts: bigint;
  numOfForwards: bigint;
  totalForwarded: Coin[];
}
export interface QueryStatsByChannelResponseProtoMsg {
  typeUrl: '/noble.forwarding.v1.QueryStatsByChannelResponse';
  value: Uint8Array;
}
export interface QueryStatsByChannelResponseSDKType {
  num_of_accounts: bigint;
  num_of_forwards: bigint;
  total_forwarded: CoinSDKType[];
}
export interface Stats {
  chainId: string;
  numOfAccounts: bigint;
  numOfForwards: bigint;
  totalForwarded: Coin[];
}
export interface StatsProtoMsg {
  typeUrl: '/noble.forwarding.v1.Stats';
  value: Uint8Array;
}
export interface StatsSDKType {
  chain_id: string;
  num_of_accounts: bigint;
  num_of_forwards: bigint;
  total_forwarded: CoinSDKType[];
}
function createBaseQueryDenoms(): QueryDenoms {
  return {};
}
export const QueryDenoms = {
  typeUrl: '/noble.forwarding.v1.QueryDenoms' as const,
  encode(
    _: QueryDenoms,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): QueryDenoms {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenoms();
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
  fromJSON(_: any): QueryDenoms {
    return {};
  },
  toJSON(_: QueryDenoms): JsonSafe<QueryDenoms> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryDenoms>): QueryDenoms {
    const message = createBaseQueryDenoms();
    return message;
  },
  fromProtoMsg(message: QueryDenomsProtoMsg): QueryDenoms {
    return QueryDenoms.decode(message.value);
  },
  toProto(message: QueryDenoms): Uint8Array {
    return QueryDenoms.encode(message).finish();
  },
  toProtoMsg(message: QueryDenoms): QueryDenomsProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.QueryDenoms',
      value: QueryDenoms.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomsResponse(): QueryDenomsResponse {
  return {
    allowedDenoms: [],
  };
}
export const QueryDenomsResponse = {
  typeUrl: '/noble.forwarding.v1.QueryDenomsResponse' as const,
  encode(
    message: QueryDenomsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.allowedDenoms) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.allowedDenoms.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomsResponse {
    return {
      allowedDenoms: Array.isArray(object?.allowedDenoms)
        ? object.allowedDenoms.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: QueryDenomsResponse): JsonSafe<QueryDenomsResponse> {
    const obj: any = {};
    if (message.allowedDenoms) {
      obj.allowedDenoms = message.allowedDenoms.map(e => e);
    } else {
      obj.allowedDenoms = [];
    }
    return obj;
  },
  fromPartial(object: Partial<QueryDenomsResponse>): QueryDenomsResponse {
    const message = createBaseQueryDenomsResponse();
    message.allowedDenoms = object.allowedDenoms?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: QueryDenomsResponseProtoMsg): QueryDenomsResponse {
    return QueryDenomsResponse.decode(message.value);
  },
  toProto(message: QueryDenomsResponse): Uint8Array {
    return QueryDenomsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryDenomsResponse): QueryDenomsResponseProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.QueryDenomsResponse',
      value: QueryDenomsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAddress(): QueryAddress {
  return {
    channel: '',
    recipient: '',
    fallback: '',
  };
}
export const QueryAddress = {
  typeUrl: '/noble.forwarding.v1.QueryAddress' as const,
  encode(
    message: QueryAddress,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.channel !== '') {
      writer.uint32(10).string(message.channel);
    }
    if (message.recipient !== '') {
      writer.uint32(18).string(message.recipient);
    }
    if (message.fallback !== '') {
      writer.uint32(26).string(message.fallback);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): QueryAddress {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAddress();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.channel = reader.string();
          break;
        case 2:
          message.recipient = reader.string();
          break;
        case 3:
          message.fallback = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAddress {
    return {
      channel: isSet(object.channel) ? String(object.channel) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      fallback: isSet(object.fallback) ? String(object.fallback) : '',
    };
  },
  toJSON(message: QueryAddress): JsonSafe<QueryAddress> {
    const obj: any = {};
    message.channel !== undefined && (obj.channel = message.channel);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    message.fallback !== undefined && (obj.fallback = message.fallback);
    return obj;
  },
  fromPartial(object: Partial<QueryAddress>): QueryAddress {
    const message = createBaseQueryAddress();
    message.channel = object.channel ?? '';
    message.recipient = object.recipient ?? '';
    message.fallback = object.fallback ?? '';
    return message;
  },
  fromProtoMsg(message: QueryAddressProtoMsg): QueryAddress {
    return QueryAddress.decode(message.value);
  },
  toProto(message: QueryAddress): Uint8Array {
    return QueryAddress.encode(message).finish();
  },
  toProtoMsg(message: QueryAddress): QueryAddressProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.QueryAddress',
      value: QueryAddress.encode(message).finish(),
    };
  },
};
function createBaseQueryAddressResponse(): QueryAddressResponse {
  return {
    address: '',
    exists: false,
  };
}
export const QueryAddressResponse = {
  typeUrl: '/noble.forwarding.v1.QueryAddressResponse' as const,
  encode(
    message: QueryAddressResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.exists === true) {
      writer.uint32(16).bool(message.exists);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAddressResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAddressResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.exists = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAddressResponse {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      exists: isSet(object.exists) ? Boolean(object.exists) : false,
    };
  },
  toJSON(message: QueryAddressResponse): JsonSafe<QueryAddressResponse> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.exists !== undefined && (obj.exists = message.exists);
    return obj;
  },
  fromPartial(object: Partial<QueryAddressResponse>): QueryAddressResponse {
    const message = createBaseQueryAddressResponse();
    message.address = object.address ?? '';
    message.exists = object.exists ?? false;
    return message;
  },
  fromProtoMsg(message: QueryAddressResponseProtoMsg): QueryAddressResponse {
    return QueryAddressResponse.decode(message.value);
  },
  toProto(message: QueryAddressResponse): Uint8Array {
    return QueryAddressResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryAddressResponse): QueryAddressResponseProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.QueryAddressResponse',
      value: QueryAddressResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryStats(): QueryStats {
  return {};
}
export const QueryStats = {
  typeUrl: '/noble.forwarding.v1.QueryStats' as const,
  encode(
    _: QueryStats,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): QueryStats {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryStats();
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
  fromJSON(_: any): QueryStats {
    return {};
  },
  toJSON(_: QueryStats): JsonSafe<QueryStats> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryStats>): QueryStats {
    const message = createBaseQueryStats();
    return message;
  },
  fromProtoMsg(message: QueryStatsProtoMsg): QueryStats {
    return QueryStats.decode(message.value);
  },
  toProto(message: QueryStats): Uint8Array {
    return QueryStats.encode(message).finish();
  },
  toProtoMsg(message: QueryStats): QueryStatsProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.QueryStats',
      value: QueryStats.encode(message).finish(),
    };
  },
};
function createBaseQueryStatsResponse_StatsEntry(): QueryStatsResponse_StatsEntry {
  return {
    key: '',
    value: undefined,
  };
}
export const QueryStatsResponse_StatsEntry = {
  encode(
    message: QueryStatsResponse_StatsEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      Stats.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryStatsResponse_StatsEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryStatsResponse_StatsEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.value = Stats.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryStatsResponse_StatsEntry {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      value: isSet(object.value) ? Stats.fromJSON(object.value) : undefined,
    };
  },
  toJSON(
    message: QueryStatsResponse_StatsEntry,
  ): JsonSafe<QueryStatsResponse_StatsEntry> {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = message.value ? Stats.toJSON(message.value) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryStatsResponse_StatsEntry>,
  ): QueryStatsResponse_StatsEntry {
    const message = createBaseQueryStatsResponse_StatsEntry();
    message.key = object.key ?? '';
    message.value =
      object.value !== undefined && object.value !== null
        ? Stats.fromPartial(object.value)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryStatsResponse_StatsEntryProtoMsg,
  ): QueryStatsResponse_StatsEntry {
    return QueryStatsResponse_StatsEntry.decode(message.value);
  },
  toProto(message: QueryStatsResponse_StatsEntry): Uint8Array {
    return QueryStatsResponse_StatsEntry.encode(message).finish();
  },
};
function createBaseQueryStatsResponse(): QueryStatsResponse {
  return {
    stats: {},
  };
}
export const QueryStatsResponse = {
  typeUrl: '/noble.forwarding.v1.QueryStatsResponse' as const,
  encode(
    message: QueryStatsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    Object.entries(message.stats).forEach(([key, value]) => {
      QueryStatsResponse_StatsEntry.encode(
        {
          key: key as any,
          value,
        },
        writer.uint32(10).fork(),
      ).ldelim();
    });
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryStatsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryStatsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          const entry1 = QueryStatsResponse_StatsEntry.decode(
            reader,
            reader.uint32(),
          );
          if (entry1.value !== undefined) {
            message.stats[entry1.key] = entry1.value;
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryStatsResponse {
    return {
      stats: isObject(object.stats)
        ? Object.entries(object.stats).reduce<{
            [key: string]: Stats;
          }>((acc, [key, value]) => {
            acc[key] = Stats.fromJSON(value);
            return acc;
          }, {})
        : {},
    };
  },
  toJSON(message: QueryStatsResponse): JsonSafe<QueryStatsResponse> {
    const obj: any = {};
    obj.stats = {};
    if (message.stats) {
      Object.entries(message.stats).forEach(([k, v]) => {
        obj.stats[k] = Stats.toJSON(v);
      });
    }
    return obj;
  },
  fromPartial(object: Partial<QueryStatsResponse>): QueryStatsResponse {
    const message = createBaseQueryStatsResponse();
    message.stats = Object.entries(object.stats ?? {}).reduce<{
      [key: string]: Stats;
    }>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = Stats.fromPartial(value);
      }
      return acc;
    }, {});
    return message;
  },
  fromProtoMsg(message: QueryStatsResponseProtoMsg): QueryStatsResponse {
    return QueryStatsResponse.decode(message.value);
  },
  toProto(message: QueryStatsResponse): Uint8Array {
    return QueryStatsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryStatsResponse): QueryStatsResponseProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.QueryStatsResponse',
      value: QueryStatsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryStatsByChannel(): QueryStatsByChannel {
  return {
    channel: '',
  };
}
export const QueryStatsByChannel = {
  typeUrl: '/noble.forwarding.v1.QueryStatsByChannel' as const,
  encode(
    message: QueryStatsByChannel,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.channel !== '') {
      writer.uint32(10).string(message.channel);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryStatsByChannel {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryStatsByChannel();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.channel = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryStatsByChannel {
    return {
      channel: isSet(object.channel) ? String(object.channel) : '',
    };
  },
  toJSON(message: QueryStatsByChannel): JsonSafe<QueryStatsByChannel> {
    const obj: any = {};
    message.channel !== undefined && (obj.channel = message.channel);
    return obj;
  },
  fromPartial(object: Partial<QueryStatsByChannel>): QueryStatsByChannel {
    const message = createBaseQueryStatsByChannel();
    message.channel = object.channel ?? '';
    return message;
  },
  fromProtoMsg(message: QueryStatsByChannelProtoMsg): QueryStatsByChannel {
    return QueryStatsByChannel.decode(message.value);
  },
  toProto(message: QueryStatsByChannel): Uint8Array {
    return QueryStatsByChannel.encode(message).finish();
  },
  toProtoMsg(message: QueryStatsByChannel): QueryStatsByChannelProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.QueryStatsByChannel',
      value: QueryStatsByChannel.encode(message).finish(),
    };
  },
};
function createBaseQueryStatsByChannelResponse(): QueryStatsByChannelResponse {
  return {
    numOfAccounts: BigInt(0),
    numOfForwards: BigInt(0),
    totalForwarded: [],
  };
}
export const QueryStatsByChannelResponse = {
  typeUrl: '/noble.forwarding.v1.QueryStatsByChannelResponse' as const,
  encode(
    message: QueryStatsByChannelResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.numOfAccounts !== BigInt(0)) {
      writer.uint32(8).uint64(message.numOfAccounts);
    }
    if (message.numOfForwards !== BigInt(0)) {
      writer.uint32(16).uint64(message.numOfForwards);
    }
    for (const v of message.totalForwarded) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryStatsByChannelResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryStatsByChannelResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.numOfAccounts = reader.uint64();
          break;
        case 2:
          message.numOfForwards = reader.uint64();
          break;
        case 3:
          message.totalForwarded.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryStatsByChannelResponse {
    return {
      numOfAccounts: isSet(object.numOfAccounts)
        ? BigInt(object.numOfAccounts.toString())
        : BigInt(0),
      numOfForwards: isSet(object.numOfForwards)
        ? BigInt(object.numOfForwards.toString())
        : BigInt(0),
      totalForwarded: Array.isArray(object?.totalForwarded)
        ? object.totalForwarded.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryStatsByChannelResponse,
  ): JsonSafe<QueryStatsByChannelResponse> {
    const obj: any = {};
    message.numOfAccounts !== undefined &&
      (obj.numOfAccounts = (message.numOfAccounts || BigInt(0)).toString());
    message.numOfForwards !== undefined &&
      (obj.numOfForwards = (message.numOfForwards || BigInt(0)).toString());
    if (message.totalForwarded) {
      obj.totalForwarded = message.totalForwarded.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.totalForwarded = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryStatsByChannelResponse>,
  ): QueryStatsByChannelResponse {
    const message = createBaseQueryStatsByChannelResponse();
    message.numOfAccounts =
      object.numOfAccounts !== undefined && object.numOfAccounts !== null
        ? BigInt(object.numOfAccounts.toString())
        : BigInt(0);
    message.numOfForwards =
      object.numOfForwards !== undefined && object.numOfForwards !== null
        ? BigInt(object.numOfForwards.toString())
        : BigInt(0);
    message.totalForwarded =
      object.totalForwarded?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryStatsByChannelResponseProtoMsg,
  ): QueryStatsByChannelResponse {
    return QueryStatsByChannelResponse.decode(message.value);
  },
  toProto(message: QueryStatsByChannelResponse): Uint8Array {
    return QueryStatsByChannelResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryStatsByChannelResponse,
  ): QueryStatsByChannelResponseProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.QueryStatsByChannelResponse',
      value: QueryStatsByChannelResponse.encode(message).finish(),
    };
  },
};
function createBaseStats(): Stats {
  return {
    chainId: '',
    numOfAccounts: BigInt(0),
    numOfForwards: BigInt(0),
    totalForwarded: [],
  };
}
export const Stats = {
  typeUrl: '/noble.forwarding.v1.Stats' as const,
  encode(
    message: Stats,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.chainId !== '') {
      writer.uint32(10).string(message.chainId);
    }
    if (message.numOfAccounts !== BigInt(0)) {
      writer.uint32(16).uint64(message.numOfAccounts);
    }
    if (message.numOfForwards !== BigInt(0)) {
      writer.uint32(24).uint64(message.numOfForwards);
    }
    for (const v of message.totalForwarded) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Stats {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStats();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.chainId = reader.string();
          break;
        case 2:
          message.numOfAccounts = reader.uint64();
          break;
        case 3:
          message.numOfForwards = reader.uint64();
          break;
        case 4:
          message.totalForwarded.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Stats {
    return {
      chainId: isSet(object.chainId) ? String(object.chainId) : '',
      numOfAccounts: isSet(object.numOfAccounts)
        ? BigInt(object.numOfAccounts.toString())
        : BigInt(0),
      numOfForwards: isSet(object.numOfForwards)
        ? BigInt(object.numOfForwards.toString())
        : BigInt(0),
      totalForwarded: Array.isArray(object?.totalForwarded)
        ? object.totalForwarded.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Stats): JsonSafe<Stats> {
    const obj: any = {};
    message.chainId !== undefined && (obj.chainId = message.chainId);
    message.numOfAccounts !== undefined &&
      (obj.numOfAccounts = (message.numOfAccounts || BigInt(0)).toString());
    message.numOfForwards !== undefined &&
      (obj.numOfForwards = (message.numOfForwards || BigInt(0)).toString());
    if (message.totalForwarded) {
      obj.totalForwarded = message.totalForwarded.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.totalForwarded = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Stats>): Stats {
    const message = createBaseStats();
    message.chainId = object.chainId ?? '';
    message.numOfAccounts =
      object.numOfAccounts !== undefined && object.numOfAccounts !== null
        ? BigInt(object.numOfAccounts.toString())
        : BigInt(0);
    message.numOfForwards =
      object.numOfForwards !== undefined && object.numOfForwards !== null
        ? BigInt(object.numOfForwards.toString())
        : BigInt(0);
    message.totalForwarded =
      object.totalForwarded?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: StatsProtoMsg): Stats {
    return Stats.decode(message.value);
  },
  toProto(message: Stats): Uint8Array {
    return Stats.encode(message).finish();
  },
  toProtoMsg(message: Stats): StatsProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.Stats',
      value: Stats.encode(message).finish(),
    };
  },
};
