//@ts-nocheck
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import {
  Timestamp,
  type TimestampSDKType,
} from '../../../google/protobuf/timestamp.js';
import { Params, type ParamsSDKType } from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { Decimal } from '../../../decimals.js';
/**
 * MsgFundCommunityPool allows an account to directly
 * fund the community pool.
 * @name MsgFundCommunityPool
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgFundCommunityPool
 */
export interface MsgFundCommunityPool {
  depositor: string;
  amount: Coin[];
}
export interface MsgFundCommunityPoolProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgFundCommunityPool';
  value: Uint8Array;
}
/**
 * MsgFundCommunityPool allows an account to directly
 * fund the community pool.
 * @name MsgFundCommunityPoolSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgFundCommunityPool
 */
export interface MsgFundCommunityPoolSDKType {
  depositor: string;
  amount: CoinSDKType[];
}
/**
 * MsgFundCommunityPoolResponse defines the Msg/FundCommunityPool response type.
 * @name MsgFundCommunityPoolResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgFundCommunityPoolResponse
 */
export interface MsgFundCommunityPoolResponse {}
export interface MsgFundCommunityPoolResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgFundCommunityPoolResponse';
  value: Uint8Array;
}
/**
 * MsgFundCommunityPoolResponse defines the Msg/FundCommunityPool response type.
 * @name MsgFundCommunityPoolResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgFundCommunityPoolResponse
 */
export interface MsgFundCommunityPoolResponseSDKType {}
/**
 * MsgCommunityPoolSpend defines a message for sending tokens from the community
 * pool to another account. This message is typically executed via a governance
 * proposal with the governance module being the executing authority.
 * @name MsgCommunityPoolSpend
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCommunityPoolSpend
 */
export interface MsgCommunityPoolSpend {
  /**
   * Authority is the address that controls the module (defaults to x/gov unless overwritten).
   */
  authority: string;
  recipient: string;
  amount: Coin[];
}
export interface MsgCommunityPoolSpendProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgCommunityPoolSpend';
  value: Uint8Array;
}
/**
 * MsgCommunityPoolSpend defines a message for sending tokens from the community
 * pool to another account. This message is typically executed via a governance
 * proposal with the governance module being the executing authority.
 * @name MsgCommunityPoolSpendSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCommunityPoolSpend
 */
export interface MsgCommunityPoolSpendSDKType {
  authority: string;
  recipient: string;
  amount: CoinSDKType[];
}
/**
 * MsgCommunityPoolSpendResponse defines the response to executing a
 * MsgCommunityPoolSpend message.
 * @name MsgCommunityPoolSpendResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCommunityPoolSpendResponse
 */
export interface MsgCommunityPoolSpendResponse {}
export interface MsgCommunityPoolSpendResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgCommunityPoolSpendResponse';
  value: Uint8Array;
}
/**
 * MsgCommunityPoolSpendResponse defines the response to executing a
 * MsgCommunityPoolSpend message.
 * @name MsgCommunityPoolSpendResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCommunityPoolSpendResponse
 */
export interface MsgCommunityPoolSpendResponseSDKType {}
/**
 * MsgCreateContinuousFund defines a message for adding continuous funds.
 * @name MsgCreateContinuousFund
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCreateContinuousFund
 */
export interface MsgCreateContinuousFund {
  /**
   * Authority is the address that controls the module (defaults to x/gov unless overwritten).
   */
  authority: string;
  /**
   * Recipient address of the account receiving funds.
   */
  recipient: string;
  /**
   * Percentage is the percentage of funds to be allocated from Community pool.
   */
  percentage: string;
  /**
   * Optional, if expiry is set, removes the state object when expired.
   */
  expiry?: Timestamp;
}
export interface MsgCreateContinuousFundProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgCreateContinuousFund';
  value: Uint8Array;
}
/**
 * MsgCreateContinuousFund defines a message for adding continuous funds.
 * @name MsgCreateContinuousFundSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCreateContinuousFund
 */
export interface MsgCreateContinuousFundSDKType {
  authority: string;
  recipient: string;
  percentage: string;
  expiry?: TimestampSDKType;
}
/**
 * MsgCreateContinuousFundResponse defines the response to executing a
 * MsgCreateContinuousFund message.
 * @name MsgCreateContinuousFundResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCreateContinuousFundResponse
 */
export interface MsgCreateContinuousFundResponse {}
export interface MsgCreateContinuousFundResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgCreateContinuousFundResponse';
  value: Uint8Array;
}
/**
 * MsgCreateContinuousFundResponse defines the response to executing a
 * MsgCreateContinuousFund message.
 * @name MsgCreateContinuousFundResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCreateContinuousFundResponse
 */
export interface MsgCreateContinuousFundResponseSDKType {}
/**
 * MsgCancelContinuousFund defines a message to cancel continuous funds for a specific recipient.
 * @name MsgCancelContinuousFund
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCancelContinuousFund
 */
export interface MsgCancelContinuousFund {
  /**
   * Authority is the account address of authority.
   */
  authority: string;
  /**
   * Recipient is the account address string of the recipient whose funds are to be cancelled.
   */
  recipient: string;
}
export interface MsgCancelContinuousFundProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgCancelContinuousFund';
  value: Uint8Array;
}
/**
 * MsgCancelContinuousFund defines a message to cancel continuous funds for a specific recipient.
 * @name MsgCancelContinuousFundSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCancelContinuousFund
 */
export interface MsgCancelContinuousFundSDKType {
  authority: string;
  recipient: string;
}
/**
 * MsgCancelContinuousFundResponse defines the response to executing a
 * MsgCancelContinuousFund message.
 * @name MsgCancelContinuousFundResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCancelContinuousFundResponse
 */
export interface MsgCancelContinuousFundResponse {
  /**
   * CanceledTime is the canceled time.
   */
  canceledTime: Timestamp;
  /**
   * CanceledHeight defines the canceled block height.
   */
  canceledHeight: bigint;
  /**
   * Recipient is the account address string of the recipient whose funds are cancelled.
   */
  recipient: string;
}
export interface MsgCancelContinuousFundResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgCancelContinuousFundResponse';
  value: Uint8Array;
}
/**
 * MsgCancelContinuousFundResponse defines the response to executing a
 * MsgCancelContinuousFund message.
 * @name MsgCancelContinuousFundResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCancelContinuousFundResponse
 */
export interface MsgCancelContinuousFundResponseSDKType {
  canceled_time: TimestampSDKType;
  canceled_height: bigint;
  recipient: string;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParams
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
  /**
   * authority is the address that controls the module (defaults to x/gov unless overwritten).
   */
  authority: string;
  /**
   * params defines the x/protocolpool parameters to update.
   *
   * NOTE: All parameters must be supplied.
   */
  params: Params;
}
export interface MsgUpdateParamsProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgUpdateParams';
  value: Uint8Array;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParamsSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
  authority: string;
  params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {}
export interface MsgUpdateParamsResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.MsgUpdateParamsResponse';
  value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {}
function createBaseMsgFundCommunityPool(): MsgFundCommunityPool {
  return {
    depositor: '',
    amount: [],
  };
}
/**
 * MsgFundCommunityPool allows an account to directly
 * fund the community pool.
 * @name MsgFundCommunityPool
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgFundCommunityPool
 */
export const MsgFundCommunityPool = {
  typeUrl: '/cosmos.protocolpool.v1.MsgFundCommunityPool' as const,
  aminoType: 'cosmos-sdk/MsgFundCommunityPool' as const,
  is(o: any): o is MsgFundCommunityPool {
    return (
      o &&
      (o.$typeUrl === MsgFundCommunityPool.typeUrl ||
        (typeof o.depositor === 'string' &&
          Array.isArray(o.amount) &&
          (!o.amount.length || Coin.is(o.amount[0]))))
    );
  },
  isSDK(o: any): o is MsgFundCommunityPoolSDKType {
    return (
      o &&
      (o.$typeUrl === MsgFundCommunityPool.typeUrl ||
        (typeof o.depositor === 'string' &&
          Array.isArray(o.amount) &&
          (!o.amount.length || Coin.isSDK(o.amount[0]))))
    );
  },
  encode(
    message: MsgFundCommunityPool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.depositor !== '') {
      writer.uint32(10).string(message.depositor);
    }
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgFundCommunityPool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgFundCommunityPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.depositor = reader.string();
          break;
        case 2:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgFundCommunityPool {
    return {
      depositor: isSet(object.depositor) ? String(object.depositor) : '',
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgFundCommunityPool): JsonSafe<MsgFundCommunityPool> {
    const obj: any = {};
    message.depositor !== undefined && (obj.depositor = message.depositor);
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgFundCommunityPool>): MsgFundCommunityPool {
    const message = createBaseMsgFundCommunityPool();
    message.depositor = object.depositor ?? '';
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgFundCommunityPoolProtoMsg): MsgFundCommunityPool {
    return MsgFundCommunityPool.decode(message.value);
  },
  toProto(message: MsgFundCommunityPool): Uint8Array {
    return MsgFundCommunityPool.encode(message).finish();
  },
  toProtoMsg(message: MsgFundCommunityPool): MsgFundCommunityPoolProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgFundCommunityPool',
      value: MsgFundCommunityPool.encode(message).finish(),
    };
  },
};
function createBaseMsgFundCommunityPoolResponse(): MsgFundCommunityPoolResponse {
  return {};
}
/**
 * MsgFundCommunityPoolResponse defines the Msg/FundCommunityPool response type.
 * @name MsgFundCommunityPoolResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgFundCommunityPoolResponse
 */
export const MsgFundCommunityPoolResponse = {
  typeUrl: '/cosmos.protocolpool.v1.MsgFundCommunityPoolResponse' as const,
  aminoType: 'cosmos-sdk/MsgFundCommunityPoolResponse' as const,
  is(o: any): o is MsgFundCommunityPoolResponse {
    return o && o.$typeUrl === MsgFundCommunityPoolResponse.typeUrl;
  },
  isSDK(o: any): o is MsgFundCommunityPoolResponseSDKType {
    return o && o.$typeUrl === MsgFundCommunityPoolResponse.typeUrl;
  },
  encode(
    _: MsgFundCommunityPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgFundCommunityPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgFundCommunityPoolResponse();
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
  fromJSON(_: any): MsgFundCommunityPoolResponse {
    return {};
  },
  toJSON(
    _: MsgFundCommunityPoolResponse,
  ): JsonSafe<MsgFundCommunityPoolResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgFundCommunityPoolResponse>,
  ): MsgFundCommunityPoolResponse {
    const message = createBaseMsgFundCommunityPoolResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgFundCommunityPoolResponseProtoMsg,
  ): MsgFundCommunityPoolResponse {
    return MsgFundCommunityPoolResponse.decode(message.value);
  },
  toProto(message: MsgFundCommunityPoolResponse): Uint8Array {
    return MsgFundCommunityPoolResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgFundCommunityPoolResponse,
  ): MsgFundCommunityPoolResponseProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgFundCommunityPoolResponse',
      value: MsgFundCommunityPoolResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgCommunityPoolSpend(): MsgCommunityPoolSpend {
  return {
    authority: '',
    recipient: '',
    amount: [],
  };
}
/**
 * MsgCommunityPoolSpend defines a message for sending tokens from the community
 * pool to another account. This message is typically executed via a governance
 * proposal with the governance module being the executing authority.
 * @name MsgCommunityPoolSpend
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCommunityPoolSpend
 */
export const MsgCommunityPoolSpend = {
  typeUrl: '/cosmos.protocolpool.v1.MsgCommunityPoolSpend' as const,
  aminoType: 'cosmos-sdk/MsgCommunityPoolSpend' as const,
  is(o: any): o is MsgCommunityPoolSpend {
    return (
      o &&
      (o.$typeUrl === MsgCommunityPoolSpend.typeUrl ||
        (typeof o.authority === 'string' &&
          typeof o.recipient === 'string' &&
          Array.isArray(o.amount) &&
          (!o.amount.length || Coin.is(o.amount[0]))))
    );
  },
  isSDK(o: any): o is MsgCommunityPoolSpendSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCommunityPoolSpend.typeUrl ||
        (typeof o.authority === 'string' &&
          typeof o.recipient === 'string' &&
          Array.isArray(o.amount) &&
          (!o.amount.length || Coin.isSDK(o.amount[0]))))
    );
  },
  encode(
    message: MsgCommunityPoolSpend,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.recipient !== '') {
      writer.uint32(18).string(message.recipient);
    }
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCommunityPoolSpend {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCommunityPoolSpend();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.recipient = reader.string();
          break;
        case 3:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCommunityPoolSpend {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgCommunityPoolSpend): JsonSafe<MsgCommunityPoolSpend> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgCommunityPoolSpend>): MsgCommunityPoolSpend {
    const message = createBaseMsgCommunityPoolSpend();
    message.authority = object.authority ?? '';
    message.recipient = object.recipient ?? '';
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgCommunityPoolSpendProtoMsg): MsgCommunityPoolSpend {
    return MsgCommunityPoolSpend.decode(message.value);
  },
  toProto(message: MsgCommunityPoolSpend): Uint8Array {
    return MsgCommunityPoolSpend.encode(message).finish();
  },
  toProtoMsg(message: MsgCommunityPoolSpend): MsgCommunityPoolSpendProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgCommunityPoolSpend',
      value: MsgCommunityPoolSpend.encode(message).finish(),
    };
  },
};
function createBaseMsgCommunityPoolSpendResponse(): MsgCommunityPoolSpendResponse {
  return {};
}
/**
 * MsgCommunityPoolSpendResponse defines the response to executing a
 * MsgCommunityPoolSpend message.
 * @name MsgCommunityPoolSpendResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCommunityPoolSpendResponse
 */
export const MsgCommunityPoolSpendResponse = {
  typeUrl: '/cosmos.protocolpool.v1.MsgCommunityPoolSpendResponse' as const,
  aminoType: 'cosmos-sdk/MsgCommunityPoolSpendResponse' as const,
  is(o: any): o is MsgCommunityPoolSpendResponse {
    return o && o.$typeUrl === MsgCommunityPoolSpendResponse.typeUrl;
  },
  isSDK(o: any): o is MsgCommunityPoolSpendResponseSDKType {
    return o && o.$typeUrl === MsgCommunityPoolSpendResponse.typeUrl;
  },
  encode(
    _: MsgCommunityPoolSpendResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCommunityPoolSpendResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCommunityPoolSpendResponse();
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
  fromJSON(_: any): MsgCommunityPoolSpendResponse {
    return {};
  },
  toJSON(
    _: MsgCommunityPoolSpendResponse,
  ): JsonSafe<MsgCommunityPoolSpendResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgCommunityPoolSpendResponse>,
  ): MsgCommunityPoolSpendResponse {
    const message = createBaseMsgCommunityPoolSpendResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgCommunityPoolSpendResponseProtoMsg,
  ): MsgCommunityPoolSpendResponse {
    return MsgCommunityPoolSpendResponse.decode(message.value);
  },
  toProto(message: MsgCommunityPoolSpendResponse): Uint8Array {
    return MsgCommunityPoolSpendResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCommunityPoolSpendResponse,
  ): MsgCommunityPoolSpendResponseProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgCommunityPoolSpendResponse',
      value: MsgCommunityPoolSpendResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgCreateContinuousFund(): MsgCreateContinuousFund {
  return {
    authority: '',
    recipient: '',
    percentage: '',
    expiry: undefined,
  };
}
/**
 * MsgCreateContinuousFund defines a message for adding continuous funds.
 * @name MsgCreateContinuousFund
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCreateContinuousFund
 */
export const MsgCreateContinuousFund = {
  typeUrl: '/cosmos.protocolpool.v1.MsgCreateContinuousFund' as const,
  aminoType: 'cosmos-sdk/MsgCreateContinuousFund' as const,
  is(o: any): o is MsgCreateContinuousFund {
    return (
      o &&
      (o.$typeUrl === MsgCreateContinuousFund.typeUrl ||
        (typeof o.authority === 'string' &&
          typeof o.recipient === 'string' &&
          typeof o.percentage === 'string'))
    );
  },
  isSDK(o: any): o is MsgCreateContinuousFundSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCreateContinuousFund.typeUrl ||
        (typeof o.authority === 'string' &&
          typeof o.recipient === 'string' &&
          typeof o.percentage === 'string'))
    );
  },
  encode(
    message: MsgCreateContinuousFund,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.recipient !== '') {
      writer.uint32(18).string(message.recipient);
    }
    if (message.percentage !== '') {
      writer
        .uint32(26)
        .string(Decimal.fromUserInput(message.percentage, 18).atomics);
    }
    if (message.expiry !== undefined) {
      Timestamp.encode(message.expiry, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateContinuousFund {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateContinuousFund();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.recipient = reader.string();
          break;
        case 3:
          message.percentage = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 4:
          message.expiry = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateContinuousFund {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      percentage: isSet(object.percentage) ? String(object.percentage) : '',
      expiry: isSet(object.expiry)
        ? fromJsonTimestamp(object.expiry)
        : undefined,
    };
  },
  toJSON(message: MsgCreateContinuousFund): JsonSafe<MsgCreateContinuousFund> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    message.percentage !== undefined && (obj.percentage = message.percentage);
    message.expiry !== undefined &&
      (obj.expiry = fromTimestamp(message.expiry).toISOString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgCreateContinuousFund>,
  ): MsgCreateContinuousFund {
    const message = createBaseMsgCreateContinuousFund();
    message.authority = object.authority ?? '';
    message.recipient = object.recipient ?? '';
    message.percentage = object.percentage ?? '';
    message.expiry =
      object.expiry !== undefined && object.expiry !== null
        ? Timestamp.fromPartial(object.expiry)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgCreateContinuousFundProtoMsg,
  ): MsgCreateContinuousFund {
    return MsgCreateContinuousFund.decode(message.value);
  },
  toProto(message: MsgCreateContinuousFund): Uint8Array {
    return MsgCreateContinuousFund.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCreateContinuousFund,
  ): MsgCreateContinuousFundProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgCreateContinuousFund',
      value: MsgCreateContinuousFund.encode(message).finish(),
    };
  },
};
function createBaseMsgCreateContinuousFundResponse(): MsgCreateContinuousFundResponse {
  return {};
}
/**
 * MsgCreateContinuousFundResponse defines the response to executing a
 * MsgCreateContinuousFund message.
 * @name MsgCreateContinuousFundResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCreateContinuousFundResponse
 */
export const MsgCreateContinuousFundResponse = {
  typeUrl: '/cosmos.protocolpool.v1.MsgCreateContinuousFundResponse' as const,
  aminoType: 'cosmos-sdk/MsgCreateContinuousFundResponse' as const,
  is(o: any): o is MsgCreateContinuousFundResponse {
    return o && o.$typeUrl === MsgCreateContinuousFundResponse.typeUrl;
  },
  isSDK(o: any): o is MsgCreateContinuousFundResponseSDKType {
    return o && o.$typeUrl === MsgCreateContinuousFundResponse.typeUrl;
  },
  encode(
    _: MsgCreateContinuousFundResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateContinuousFundResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateContinuousFundResponse();
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
  fromJSON(_: any): MsgCreateContinuousFundResponse {
    return {};
  },
  toJSON(
    _: MsgCreateContinuousFundResponse,
  ): JsonSafe<MsgCreateContinuousFundResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgCreateContinuousFundResponse>,
  ): MsgCreateContinuousFundResponse {
    const message = createBaseMsgCreateContinuousFundResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgCreateContinuousFundResponseProtoMsg,
  ): MsgCreateContinuousFundResponse {
    return MsgCreateContinuousFundResponse.decode(message.value);
  },
  toProto(message: MsgCreateContinuousFundResponse): Uint8Array {
    return MsgCreateContinuousFundResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCreateContinuousFundResponse,
  ): MsgCreateContinuousFundResponseProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgCreateContinuousFundResponse',
      value: MsgCreateContinuousFundResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgCancelContinuousFund(): MsgCancelContinuousFund {
  return {
    authority: '',
    recipient: '',
  };
}
/**
 * MsgCancelContinuousFund defines a message to cancel continuous funds for a specific recipient.
 * @name MsgCancelContinuousFund
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCancelContinuousFund
 */
export const MsgCancelContinuousFund = {
  typeUrl: '/cosmos.protocolpool.v1.MsgCancelContinuousFund' as const,
  aminoType: 'cosmos-sdk/MsgCancelContinuousFund' as const,
  is(o: any): o is MsgCancelContinuousFund {
    return (
      o &&
      (o.$typeUrl === MsgCancelContinuousFund.typeUrl ||
        (typeof o.authority === 'string' && typeof o.recipient === 'string'))
    );
  },
  isSDK(o: any): o is MsgCancelContinuousFundSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCancelContinuousFund.typeUrl ||
        (typeof o.authority === 'string' && typeof o.recipient === 'string'))
    );
  },
  encode(
    message: MsgCancelContinuousFund,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.recipient !== '') {
      writer.uint32(18).string(message.recipient);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCancelContinuousFund {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCancelContinuousFund();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
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
  fromJSON(object: any): MsgCancelContinuousFund {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
    };
  },
  toJSON(message: MsgCancelContinuousFund): JsonSafe<MsgCancelContinuousFund> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    return obj;
  },
  fromPartial(
    object: Partial<MsgCancelContinuousFund>,
  ): MsgCancelContinuousFund {
    const message = createBaseMsgCancelContinuousFund();
    message.authority = object.authority ?? '';
    message.recipient = object.recipient ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgCancelContinuousFundProtoMsg,
  ): MsgCancelContinuousFund {
    return MsgCancelContinuousFund.decode(message.value);
  },
  toProto(message: MsgCancelContinuousFund): Uint8Array {
    return MsgCancelContinuousFund.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCancelContinuousFund,
  ): MsgCancelContinuousFundProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgCancelContinuousFund',
      value: MsgCancelContinuousFund.encode(message).finish(),
    };
  },
};
function createBaseMsgCancelContinuousFundResponse(): MsgCancelContinuousFundResponse {
  return {
    canceledTime: Timestamp.fromPartial({}),
    canceledHeight: BigInt(0),
    recipient: '',
  };
}
/**
 * MsgCancelContinuousFundResponse defines the response to executing a
 * MsgCancelContinuousFund message.
 * @name MsgCancelContinuousFundResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgCancelContinuousFundResponse
 */
export const MsgCancelContinuousFundResponse = {
  typeUrl: '/cosmos.protocolpool.v1.MsgCancelContinuousFundResponse' as const,
  aminoType: 'cosmos-sdk/MsgCancelContinuousFundResponse' as const,
  is(o: any): o is MsgCancelContinuousFundResponse {
    return (
      o &&
      (o.$typeUrl === MsgCancelContinuousFundResponse.typeUrl ||
        (Timestamp.is(o.canceledTime) &&
          typeof o.canceledHeight === 'bigint' &&
          typeof o.recipient === 'string'))
    );
  },
  isSDK(o: any): o is MsgCancelContinuousFundResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCancelContinuousFundResponse.typeUrl ||
        (Timestamp.isSDK(o.canceled_time) &&
          typeof o.canceled_height === 'bigint' &&
          typeof o.recipient === 'string'))
    );
  },
  encode(
    message: MsgCancelContinuousFundResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.canceledTime !== undefined) {
      Timestamp.encode(message.canceledTime, writer.uint32(10).fork()).ldelim();
    }
    if (message.canceledHeight !== BigInt(0)) {
      writer.uint32(16).uint64(message.canceledHeight);
    }
    if (message.recipient !== '') {
      writer.uint32(26).string(message.recipient);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCancelContinuousFundResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCancelContinuousFundResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.canceledTime = Timestamp.decode(reader, reader.uint32());
          break;
        case 2:
          message.canceledHeight = reader.uint64();
          break;
        case 3:
          message.recipient = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCancelContinuousFundResponse {
    return {
      canceledTime: isSet(object.canceledTime)
        ? fromJsonTimestamp(object.canceledTime)
        : undefined,
      canceledHeight: isSet(object.canceledHeight)
        ? BigInt(object.canceledHeight.toString())
        : BigInt(0),
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
    };
  },
  toJSON(
    message: MsgCancelContinuousFundResponse,
  ): JsonSafe<MsgCancelContinuousFundResponse> {
    const obj: any = {};
    message.canceledTime !== undefined &&
      (obj.canceledTime = fromTimestamp(message.canceledTime).toISOString());
    message.canceledHeight !== undefined &&
      (obj.canceledHeight = (message.canceledHeight || BigInt(0)).toString());
    message.recipient !== undefined && (obj.recipient = message.recipient);
    return obj;
  },
  fromPartial(
    object: Partial<MsgCancelContinuousFundResponse>,
  ): MsgCancelContinuousFundResponse {
    const message = createBaseMsgCancelContinuousFundResponse();
    message.canceledTime =
      object.canceledTime !== undefined && object.canceledTime !== null
        ? Timestamp.fromPartial(object.canceledTime)
        : undefined;
    message.canceledHeight =
      object.canceledHeight !== undefined && object.canceledHeight !== null
        ? BigInt(object.canceledHeight.toString())
        : BigInt(0);
    message.recipient = object.recipient ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgCancelContinuousFundResponseProtoMsg,
  ): MsgCancelContinuousFundResponse {
    return MsgCancelContinuousFundResponse.decode(message.value);
  },
  toProto(message: MsgCancelContinuousFundResponse): Uint8Array {
    return MsgCancelContinuousFundResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCancelContinuousFundResponse,
  ): MsgCancelContinuousFundResponseProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgCancelContinuousFundResponse',
      value: MsgCancelContinuousFundResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateParams(): MsgUpdateParams {
  return {
    authority: '',
    params: Params.fromPartial({}),
  };
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParams
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgUpdateParams
 */
export const MsgUpdateParams = {
  typeUrl: '/cosmos.protocolpool.v1.MsgUpdateParams' as const,
  aminoType: 'cosmos-sdk/MsgUpdateParams' as const,
  is(o: any): o is MsgUpdateParams {
    return (
      o &&
      (o.$typeUrl === MsgUpdateParams.typeUrl ||
        (typeof o.authority === 'string' && Params.is(o.params)))
    );
  },
  isSDK(o: any): o is MsgUpdateParamsSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateParams.typeUrl ||
        (typeof o.authority === 'string' && Params.isSDK(o.params)))
    );
  },
  encode(
    message: MsgUpdateParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.params = Params.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateParams {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams {
    const message = createBaseMsgUpdateParams();
    message.authority = object.authority ?? '';
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgUpdateParamsProtoMsg): MsgUpdateParams {
    return MsgUpdateParams.decode(message.value);
  },
  toProto(message: MsgUpdateParams): Uint8Array {
    return MsgUpdateParams.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgUpdateParams',
      value: MsgUpdateParams.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateParamsResponse(): MsgUpdateParamsResponse {
  return {};
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.MsgUpdateParamsResponse
 */
export const MsgUpdateParamsResponse = {
  typeUrl: '/cosmos.protocolpool.v1.MsgUpdateParamsResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateParamsResponse' as const,
  is(o: any): o is MsgUpdateParamsResponse {
    return o && o.$typeUrl === MsgUpdateParamsResponse.typeUrl;
  },
  isSDK(o: any): o is MsgUpdateParamsResponseSDKType {
    return o && o.$typeUrl === MsgUpdateParamsResponse.typeUrl;
  },
  encode(
    _: MsgUpdateParamsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateParamsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParamsResponse();
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
  fromJSON(_: any): MsgUpdateParamsResponse {
    return {};
  },
  toJSON(_: MsgUpdateParamsResponse): JsonSafe<MsgUpdateParamsResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse {
    const message = createBaseMsgUpdateParamsResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateParamsResponseProtoMsg,
  ): MsgUpdateParamsResponse {
    return MsgUpdateParamsResponse.decode(message.value);
  },
  toProto(message: MsgUpdateParamsResponse): Uint8Array {
    return MsgUpdateParamsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateParamsResponse,
  ): MsgUpdateParamsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.MsgUpdateParamsResponse',
      value: MsgUpdateParamsResponse.encode(message).finish(),
    };
  },
};
