//@ts-nocheck
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import {
  Timestamp,
  type TimestampSDKType,
} from '../../../google/protobuf/timestamp.js';
import {
  Duration,
  type DurationSDKType,
} from '../../../google/protobuf/duration.js';
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { GlobalDecoderRegistry } from '../../../registry.js';
/**
 * BasicAllowance implements Allowance with a one-time grant of coins
 * that optionally expires. The grantee can use up to SpendLimit to cover fees.
 * @name BasicAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.BasicAllowance
 */
export interface BasicAllowance {
  $typeUrl?: '/cosmos.feegrant.v1beta1.BasicAllowance';
  /**
   * spend_limit specifies the maximum amount of coins that can be spent
   * by this allowance and will be updated as coins are spent. If it is
   * empty, there is no spend limit and any amount of coins can be spent.
   */
  spendLimit: Coin[];
  /**
   * expiration specifies an optional time when this allowance expires
   */
  expiration?: Timestamp;
}
export interface BasicAllowanceProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance';
  value: Uint8Array;
}
/**
 * BasicAllowance implements Allowance with a one-time grant of coins
 * that optionally expires. The grantee can use up to SpendLimit to cover fees.
 * @name BasicAllowanceSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.BasicAllowance
 */
export interface BasicAllowanceSDKType {
  $typeUrl?: '/cosmos.feegrant.v1beta1.BasicAllowance';
  spend_limit: CoinSDKType[];
  expiration?: TimestampSDKType;
}
/**
 * PeriodicAllowance extends Allowance to allow for both a maximum cap,
 * as well as a limit per time period.
 * @name PeriodicAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.PeriodicAllowance
 */
export interface PeriodicAllowance {
  $typeUrl?: '/cosmos.feegrant.v1beta1.PeriodicAllowance';
  /**
   * basic specifies a struct of `BasicAllowance`
   */
  basic: BasicAllowance;
  /**
   * period specifies the time duration in which period_spend_limit coins can
   * be spent before that allowance is reset
   */
  period: Duration;
  /**
   * period_spend_limit specifies the maximum number of coins that can be spent
   * in the period
   */
  periodSpendLimit: Coin[];
  /**
   * period_can_spend is the number of coins left to be spent before the period_reset time
   */
  periodCanSpend: Coin[];
  /**
   * period_reset is the time at which this period resets and a new one begins,
   * it is calculated from the start time of the first transaction after the
   * last period ended
   */
  periodReset: Timestamp;
}
export interface PeriodicAllowanceProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.PeriodicAllowance';
  value: Uint8Array;
}
/**
 * PeriodicAllowance extends Allowance to allow for both a maximum cap,
 * as well as a limit per time period.
 * @name PeriodicAllowanceSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.PeriodicAllowance
 */
export interface PeriodicAllowanceSDKType {
  $typeUrl?: '/cosmos.feegrant.v1beta1.PeriodicAllowance';
  basic: BasicAllowanceSDKType;
  period: DurationSDKType;
  period_spend_limit: CoinSDKType[];
  period_can_spend: CoinSDKType[];
  period_reset: TimestampSDKType;
}
/**
 * AllowedMsgAllowance creates allowance only for specified message types.
 * @name AllowedMsgAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.AllowedMsgAllowance
 */
export interface AllowedMsgAllowance {
  $typeUrl?: '/cosmos.feegrant.v1beta1.AllowedMsgAllowance';
  /**
   * allowance can be any of basic and periodic fee allowance.
   */
  allowance?:
    | (BasicAllowance & PeriodicAllowance & AllowedMsgAllowance & Any)
    | undefined;
  /**
   * allowed_messages are the messages for which the grantee has the access.
   */
  allowedMessages: string[];
}
export interface AllowedMsgAllowanceProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.AllowedMsgAllowance';
  value: Uint8Array;
}
/**
 * AllowedMsgAllowance creates allowance only for specified message types.
 * @name AllowedMsgAllowanceSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.AllowedMsgAllowance
 */
export interface AllowedMsgAllowanceSDKType {
  $typeUrl?: '/cosmos.feegrant.v1beta1.AllowedMsgAllowance';
  allowance?:
    | BasicAllowanceSDKType
    | PeriodicAllowanceSDKType
    | AllowedMsgAllowanceSDKType
    | AnySDKType
    | undefined;
  allowed_messages: string[];
}
/**
 * Grant is stored in the KVStore to record a grant with full context
 * @name Grant
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.Grant
 */
export interface Grant {
  /**
   * granter is the address of the user granting an allowance of their funds.
   */
  granter: string;
  /**
   * grantee is the address of the user being granted an allowance of another user's funds.
   */
  grantee: string;
  /**
   * allowance can be any of basic, periodic, allowed fee allowance.
   */
  allowance?:
    | (BasicAllowance & PeriodicAllowance & AllowedMsgAllowance & Any)
    | undefined;
}
export interface GrantProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.Grant';
  value: Uint8Array;
}
/**
 * Grant is stored in the KVStore to record a grant with full context
 * @name GrantSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.Grant
 */
export interface GrantSDKType {
  granter: string;
  grantee: string;
  allowance?:
    | BasicAllowanceSDKType
    | PeriodicAllowanceSDKType
    | AllowedMsgAllowanceSDKType
    | AnySDKType
    | undefined;
}
function createBaseBasicAllowance(): BasicAllowance {
  return {
    $typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance',
    spendLimit: [],
    expiration: undefined,
  };
}
/**
 * BasicAllowance implements Allowance with a one-time grant of coins
 * that optionally expires. The grantee can use up to SpendLimit to cover fees.
 * @name BasicAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.BasicAllowance
 */
export const BasicAllowance = {
  typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance' as const,
  aminoType: 'cosmos-sdk/BasicAllowance' as const,
  is(o: any): o is BasicAllowance {
    return (
      o &&
      (o.$typeUrl === BasicAllowance.typeUrl ||
        (Array.isArray(o.spendLimit) &&
          (!o.spendLimit.length || Coin.is(o.spendLimit[0]))))
    );
  },
  isSDK(o: any): o is BasicAllowanceSDKType {
    return (
      o &&
      (o.$typeUrl === BasicAllowance.typeUrl ||
        (Array.isArray(o.spend_limit) &&
          (!o.spend_limit.length || Coin.isSDK(o.spend_limit[0]))))
    );
  },
  encode(
    message: BasicAllowance,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.spendLimit) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.expiration !== undefined) {
      Timestamp.encode(message.expiration, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): BasicAllowance {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBasicAllowance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.spendLimit.push(Coin.decode(reader, reader.uint32()));
          break;
        case 2:
          message.expiration = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): BasicAllowance {
    return {
      spendLimit: Array.isArray(object?.spendLimit)
        ? object.spendLimit.map((e: any) => Coin.fromJSON(e))
        : [],
      expiration: isSet(object.expiration)
        ? fromJsonTimestamp(object.expiration)
        : undefined,
    };
  },
  toJSON(message: BasicAllowance): JsonSafe<BasicAllowance> {
    const obj: any = {};
    if (message.spendLimit) {
      obj.spendLimit = message.spendLimit.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.spendLimit = [];
    }
    message.expiration !== undefined &&
      (obj.expiration = fromTimestamp(message.expiration).toISOString());
    return obj;
  },
  fromPartial(object: Partial<BasicAllowance>): BasicAllowance {
    const message = createBaseBasicAllowance();
    message.spendLimit = object.spendLimit?.map(e => Coin.fromPartial(e)) || [];
    message.expiration =
      object.expiration !== undefined && object.expiration !== null
        ? Timestamp.fromPartial(object.expiration)
        : undefined;
    return message;
  },
  fromProtoMsg(message: BasicAllowanceProtoMsg): BasicAllowance {
    return BasicAllowance.decode(message.value);
  },
  toProto(message: BasicAllowance): Uint8Array {
    return BasicAllowance.encode(message).finish();
  },
  toProtoMsg(message: BasicAllowance): BasicAllowanceProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance',
      value: BasicAllowance.encode(message).finish(),
    };
  },
};
function createBasePeriodicAllowance(): PeriodicAllowance {
  return {
    $typeUrl: '/cosmos.feegrant.v1beta1.PeriodicAllowance',
    basic: BasicAllowance.fromPartial({}),
    period: Duration.fromPartial({}),
    periodSpendLimit: [],
    periodCanSpend: [],
    periodReset: Timestamp.fromPartial({}),
  };
}
/**
 * PeriodicAllowance extends Allowance to allow for both a maximum cap,
 * as well as a limit per time period.
 * @name PeriodicAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.PeriodicAllowance
 */
export const PeriodicAllowance = {
  typeUrl: '/cosmos.feegrant.v1beta1.PeriodicAllowance' as const,
  aminoType: 'cosmos-sdk/PeriodicAllowance' as const,
  is(o: any): o is PeriodicAllowance {
    return (
      o &&
      (o.$typeUrl === PeriodicAllowance.typeUrl ||
        (BasicAllowance.is(o.basic) &&
          Duration.is(o.period) &&
          Array.isArray(o.periodSpendLimit) &&
          (!o.periodSpendLimit.length || Coin.is(o.periodSpendLimit[0])) &&
          Array.isArray(o.periodCanSpend) &&
          (!o.periodCanSpend.length || Coin.is(o.periodCanSpend[0])) &&
          Timestamp.is(o.periodReset)))
    );
  },
  isSDK(o: any): o is PeriodicAllowanceSDKType {
    return (
      o &&
      (o.$typeUrl === PeriodicAllowance.typeUrl ||
        (BasicAllowance.isSDK(o.basic) &&
          Duration.isSDK(o.period) &&
          Array.isArray(o.period_spend_limit) &&
          (!o.period_spend_limit.length ||
            Coin.isSDK(o.period_spend_limit[0])) &&
          Array.isArray(o.period_can_spend) &&
          (!o.period_can_spend.length || Coin.isSDK(o.period_can_spend[0])) &&
          Timestamp.isSDK(o.period_reset)))
    );
  },
  encode(
    message: PeriodicAllowance,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.basic !== undefined) {
      BasicAllowance.encode(message.basic, writer.uint32(10).fork()).ldelim();
    }
    if (message.period !== undefined) {
      Duration.encode(message.period, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.periodSpendLimit) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.periodCanSpend) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (message.periodReset !== undefined) {
      Timestamp.encode(message.periodReset, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PeriodicAllowance {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePeriodicAllowance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.basic = BasicAllowance.decode(reader, reader.uint32());
          break;
        case 2:
          message.period = Duration.decode(reader, reader.uint32());
          break;
        case 3:
          message.periodSpendLimit.push(Coin.decode(reader, reader.uint32()));
          break;
        case 4:
          message.periodCanSpend.push(Coin.decode(reader, reader.uint32()));
          break;
        case 5:
          message.periodReset = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PeriodicAllowance {
    return {
      basic: isSet(object.basic)
        ? BasicAllowance.fromJSON(object.basic)
        : undefined,
      period: isSet(object.period)
        ? Duration.fromJSON(object.period)
        : undefined,
      periodSpendLimit: Array.isArray(object?.periodSpendLimit)
        ? object.periodSpendLimit.map((e: any) => Coin.fromJSON(e))
        : [],
      periodCanSpend: Array.isArray(object?.periodCanSpend)
        ? object.periodCanSpend.map((e: any) => Coin.fromJSON(e))
        : [],
      periodReset: isSet(object.periodReset)
        ? fromJsonTimestamp(object.periodReset)
        : undefined,
    };
  },
  toJSON(message: PeriodicAllowance): JsonSafe<PeriodicAllowance> {
    const obj: any = {};
    message.basic !== undefined &&
      (obj.basic = message.basic
        ? BasicAllowance.toJSON(message.basic)
        : undefined);
    message.period !== undefined &&
      (obj.period = message.period
        ? Duration.toJSON(message.period)
        : undefined);
    if (message.periodSpendLimit) {
      obj.periodSpendLimit = message.periodSpendLimit.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.periodSpendLimit = [];
    }
    if (message.periodCanSpend) {
      obj.periodCanSpend = message.periodCanSpend.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.periodCanSpend = [];
    }
    message.periodReset !== undefined &&
      (obj.periodReset = fromTimestamp(message.periodReset).toISOString());
    return obj;
  },
  fromPartial(object: Partial<PeriodicAllowance>): PeriodicAllowance {
    const message = createBasePeriodicAllowance();
    message.basic =
      object.basic !== undefined && object.basic !== null
        ? BasicAllowance.fromPartial(object.basic)
        : undefined;
    message.period =
      object.period !== undefined && object.period !== null
        ? Duration.fromPartial(object.period)
        : undefined;
    message.periodSpendLimit =
      object.periodSpendLimit?.map(e => Coin.fromPartial(e)) || [];
    message.periodCanSpend =
      object.periodCanSpend?.map(e => Coin.fromPartial(e)) || [];
    message.periodReset =
      object.periodReset !== undefined && object.periodReset !== null
        ? Timestamp.fromPartial(object.periodReset)
        : undefined;
    return message;
  },
  fromProtoMsg(message: PeriodicAllowanceProtoMsg): PeriodicAllowance {
    return PeriodicAllowance.decode(message.value);
  },
  toProto(message: PeriodicAllowance): Uint8Array {
    return PeriodicAllowance.encode(message).finish();
  },
  toProtoMsg(message: PeriodicAllowance): PeriodicAllowanceProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.PeriodicAllowance',
      value: PeriodicAllowance.encode(message).finish(),
    };
  },
};
function createBaseAllowedMsgAllowance(): AllowedMsgAllowance {
  return {
    $typeUrl: '/cosmos.feegrant.v1beta1.AllowedMsgAllowance',
    allowance: undefined,
    allowedMessages: [],
  };
}
/**
 * AllowedMsgAllowance creates allowance only for specified message types.
 * @name AllowedMsgAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.AllowedMsgAllowance
 */
export const AllowedMsgAllowance = {
  typeUrl: '/cosmos.feegrant.v1beta1.AllowedMsgAllowance' as const,
  aminoType: 'cosmos-sdk/AllowedMsgAllowance' as const,
  is(o: any): o is AllowedMsgAllowance {
    return (
      o &&
      (o.$typeUrl === AllowedMsgAllowance.typeUrl ||
        (Array.isArray(o.allowedMessages) &&
          (!o.allowedMessages.length ||
            typeof o.allowedMessages[0] === 'string')))
    );
  },
  isSDK(o: any): o is AllowedMsgAllowanceSDKType {
    return (
      o &&
      (o.$typeUrl === AllowedMsgAllowance.typeUrl ||
        (Array.isArray(o.allowed_messages) &&
          (!o.allowed_messages.length ||
            typeof o.allowed_messages[0] === 'string')))
    );
  },
  encode(
    message: AllowedMsgAllowance,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.allowance !== undefined) {
      Any.encode(
        GlobalDecoderRegistry.wrapAny(message.allowance),
        writer.uint32(10).fork(),
      ).ldelim();
    }
    for (const v of message.allowedMessages) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AllowedMsgAllowance {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAllowedMsgAllowance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.allowance = GlobalDecoderRegistry.unwrapAny(reader);
          break;
        case 2:
          message.allowedMessages.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AllowedMsgAllowance {
    return {
      allowance: isSet(object.allowance)
        ? GlobalDecoderRegistry.fromJSON(object.allowance)
        : undefined,
      allowedMessages: Array.isArray(object?.allowedMessages)
        ? object.allowedMessages.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: AllowedMsgAllowance): JsonSafe<AllowedMsgAllowance> {
    const obj: any = {};
    message.allowance !== undefined &&
      (obj.allowance = message.allowance
        ? GlobalDecoderRegistry.toJSON(message.allowance)
        : undefined);
    if (message.allowedMessages) {
      obj.allowedMessages = message.allowedMessages.map(e => e);
    } else {
      obj.allowedMessages = [];
    }
    return obj;
  },
  fromPartial(object: Partial<AllowedMsgAllowance>): AllowedMsgAllowance {
    const message = createBaseAllowedMsgAllowance();
    message.allowance =
      object.allowance !== undefined && object.allowance !== null
        ? GlobalDecoderRegistry.fromPartial(object.allowance)
        : undefined;
    message.allowedMessages = object.allowedMessages?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: AllowedMsgAllowanceProtoMsg): AllowedMsgAllowance {
    return AllowedMsgAllowance.decode(message.value);
  },
  toProto(message: AllowedMsgAllowance): Uint8Array {
    return AllowedMsgAllowance.encode(message).finish();
  },
  toProtoMsg(message: AllowedMsgAllowance): AllowedMsgAllowanceProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.AllowedMsgAllowance',
      value: AllowedMsgAllowance.encode(message).finish(),
    };
  },
};
function createBaseGrant(): Grant {
  return {
    granter: '',
    grantee: '',
    allowance: undefined,
  };
}
/**
 * Grant is stored in the KVStore to record a grant with full context
 * @name Grant
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.Grant
 */
export const Grant = {
  typeUrl: '/cosmos.feegrant.v1beta1.Grant' as const,
  aminoType: 'cosmos-sdk/Grant' as const,
  is(o: any): o is Grant {
    return (
      o &&
      (o.$typeUrl === Grant.typeUrl ||
        (typeof o.granter === 'string' && typeof o.grantee === 'string'))
    );
  },
  isSDK(o: any): o is GrantSDKType {
    return (
      o &&
      (o.$typeUrl === Grant.typeUrl ||
        (typeof o.granter === 'string' && typeof o.grantee === 'string'))
    );
  },
  encode(
    message: Grant,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(18).string(message.grantee);
    }
    if (message.allowance !== undefined) {
      Any.encode(
        GlobalDecoderRegistry.wrapAny(message.allowance),
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Grant {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGrant();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
          break;
        case 2:
          message.grantee = reader.string();
          break;
        case 3:
          message.allowance = GlobalDecoderRegistry.unwrapAny(reader);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Grant {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      allowance: isSet(object.allowance)
        ? GlobalDecoderRegistry.fromJSON(object.allowance)
        : undefined,
    };
  },
  toJSON(message: Grant): JsonSafe<Grant> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.allowance !== undefined &&
      (obj.allowance = message.allowance
        ? GlobalDecoderRegistry.toJSON(message.allowance)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<Grant>): Grant {
    const message = createBaseGrant();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    message.allowance =
      object.allowance !== undefined && object.allowance !== null
        ? GlobalDecoderRegistry.fromPartial(object.allowance)
        : undefined;
    return message;
  },
  fromProtoMsg(message: GrantProtoMsg): Grant {
    return Grant.decode(message.value);
  },
  toProto(message: Grant): Uint8Array {
    return Grant.encode(message).finish();
  },
  toProtoMsg(message: Grant): GrantProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.Grant',
      value: Grant.encode(message).finish(),
    };
  },
};
