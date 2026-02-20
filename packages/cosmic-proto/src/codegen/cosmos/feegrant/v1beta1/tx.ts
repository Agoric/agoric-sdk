//@ts-nocheck
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import {
  BasicAllowance,
  type BasicAllowanceSDKType,
  PeriodicAllowance,
  type PeriodicAllowanceSDKType,
  AllowedMsgAllowance,
  type AllowedMsgAllowanceSDKType,
} from './feegrant.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { GlobalDecoderRegistry } from '../../../registry.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgGrantAllowance adds permission for Grantee to spend up to Allowance
 * of fees from the account of Granter.
 * @name MsgGrantAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowance
 */
export interface MsgGrantAllowance {
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
export interface MsgGrantAllowanceProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowance';
  value: Uint8Array;
}
/**
 * MsgGrantAllowance adds permission for Grantee to spend up to Allowance
 * of fees from the account of Granter.
 * @name MsgGrantAllowanceSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowance
 */
export interface MsgGrantAllowanceSDKType {
  granter: string;
  grantee: string;
  allowance?:
    | BasicAllowanceSDKType
    | PeriodicAllowanceSDKType
    | AllowedMsgAllowanceSDKType
    | AnySDKType
    | undefined;
}
/**
 * MsgGrantAllowanceResponse defines the Msg/GrantAllowanceResponse response type.
 * @name MsgGrantAllowanceResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse
 */
export interface MsgGrantAllowanceResponse {}
export interface MsgGrantAllowanceResponseProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse';
  value: Uint8Array;
}
/**
 * MsgGrantAllowanceResponse defines the Msg/GrantAllowanceResponse response type.
 * @name MsgGrantAllowanceResponseSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse
 */
export interface MsgGrantAllowanceResponseSDKType {}
/**
 * MsgRevokeAllowance removes any existing Allowance from Granter to Grantee.
 * @name MsgRevokeAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowance
 */
export interface MsgRevokeAllowance {
  /**
   * granter is the address of the user granting an allowance of their funds.
   */
  granter: string;
  /**
   * grantee is the address of the user being granted an allowance of another user's funds.
   */
  grantee: string;
}
export interface MsgRevokeAllowanceProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowance';
  value: Uint8Array;
}
/**
 * MsgRevokeAllowance removes any existing Allowance from Granter to Grantee.
 * @name MsgRevokeAllowanceSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowance
 */
export interface MsgRevokeAllowanceSDKType {
  granter: string;
  grantee: string;
}
/**
 * MsgRevokeAllowanceResponse defines the Msg/RevokeAllowanceResponse response type.
 * @name MsgRevokeAllowanceResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse
 */
export interface MsgRevokeAllowanceResponse {}
export interface MsgRevokeAllowanceResponseProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse';
  value: Uint8Array;
}
/**
 * MsgRevokeAllowanceResponse defines the Msg/RevokeAllowanceResponse response type.
 * @name MsgRevokeAllowanceResponseSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse
 */
export interface MsgRevokeAllowanceResponseSDKType {}
/**
 * MsgPruneAllowances prunes expired fee allowances.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowances
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowances
 */
export interface MsgPruneAllowances {
  /**
   * pruner is the address of the user pruning expired allowances.
   */
  pruner: string;
}
export interface MsgPruneAllowancesProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgPruneAllowances';
  value: Uint8Array;
}
/**
 * MsgPruneAllowances prunes expired fee allowances.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowancesSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowances
 */
export interface MsgPruneAllowancesSDKType {
  pruner: string;
}
/**
 * MsgPruneAllowancesResponse defines the Msg/PruneAllowancesResponse response type.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowancesResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse
 */
export interface MsgPruneAllowancesResponse {}
export interface MsgPruneAllowancesResponseProtoMsg {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse';
  value: Uint8Array;
}
/**
 * MsgPruneAllowancesResponse defines the Msg/PruneAllowancesResponse response type.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowancesResponseSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse
 */
export interface MsgPruneAllowancesResponseSDKType {}
function createBaseMsgGrantAllowance(): MsgGrantAllowance {
  return {
    granter: '',
    grantee: '',
    allowance: undefined,
  };
}
/**
 * MsgGrantAllowance adds permission for Grantee to spend up to Allowance
 * of fees from the account of Granter.
 * @name MsgGrantAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowance
 */
export const MsgGrantAllowance = {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowance' as const,
  aminoType: 'cosmos-sdk/MsgGrantAllowance' as const,
  is(o: any): o is MsgGrantAllowance {
    return (
      o &&
      (o.$typeUrl === MsgGrantAllowance.typeUrl ||
        (typeof o.granter === 'string' && typeof o.grantee === 'string'))
    );
  },
  isSDK(o: any): o is MsgGrantAllowanceSDKType {
    return (
      o &&
      (o.$typeUrl === MsgGrantAllowance.typeUrl ||
        (typeof o.granter === 'string' && typeof o.grantee === 'string'))
    );
  },
  encode(
    message: MsgGrantAllowance,
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
  decode(input: BinaryReader | Uint8Array, length?: number): MsgGrantAllowance {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgGrantAllowance();
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
  fromJSON(object: any): MsgGrantAllowance {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      allowance: isSet(object.allowance)
        ? GlobalDecoderRegistry.fromJSON(object.allowance)
        : undefined,
    };
  },
  toJSON(message: MsgGrantAllowance): JsonSafe<MsgGrantAllowance> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.allowance !== undefined &&
      (obj.allowance = message.allowance
        ? GlobalDecoderRegistry.toJSON(message.allowance)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgGrantAllowance>): MsgGrantAllowance {
    const message = createBaseMsgGrantAllowance();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    message.allowance =
      object.allowance !== undefined && object.allowance !== null
        ? GlobalDecoderRegistry.fromPartial(object.allowance)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgGrantAllowanceProtoMsg): MsgGrantAllowance {
    return MsgGrantAllowance.decode(message.value);
  },
  toProto(message: MsgGrantAllowance): Uint8Array {
    return MsgGrantAllowance.encode(message).finish();
  },
  toProtoMsg(message: MsgGrantAllowance): MsgGrantAllowanceProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowance',
      value: MsgGrantAllowance.encode(message).finish(),
    };
  },
};
function createBaseMsgGrantAllowanceResponse(): MsgGrantAllowanceResponse {
  return {};
}
/**
 * MsgGrantAllowanceResponse defines the Msg/GrantAllowanceResponse response type.
 * @name MsgGrantAllowanceResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse
 */
export const MsgGrantAllowanceResponse = {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse' as const,
  aminoType: 'cosmos-sdk/MsgGrantAllowanceResponse' as const,
  is(o: any): o is MsgGrantAllowanceResponse {
    return o && o.$typeUrl === MsgGrantAllowanceResponse.typeUrl;
  },
  isSDK(o: any): o is MsgGrantAllowanceResponseSDKType {
    return o && o.$typeUrl === MsgGrantAllowanceResponse.typeUrl;
  },
  encode(
    _: MsgGrantAllowanceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgGrantAllowanceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgGrantAllowanceResponse();
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
  fromJSON(_: any): MsgGrantAllowanceResponse {
    return {};
  },
  toJSON(_: MsgGrantAllowanceResponse): JsonSafe<MsgGrantAllowanceResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgGrantAllowanceResponse>,
  ): MsgGrantAllowanceResponse {
    const message = createBaseMsgGrantAllowanceResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgGrantAllowanceResponseProtoMsg,
  ): MsgGrantAllowanceResponse {
    return MsgGrantAllowanceResponse.decode(message.value);
  },
  toProto(message: MsgGrantAllowanceResponse): Uint8Array {
    return MsgGrantAllowanceResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgGrantAllowanceResponse,
  ): MsgGrantAllowanceResponseProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse',
      value: MsgGrantAllowanceResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgRevokeAllowance(): MsgRevokeAllowance {
  return {
    granter: '',
    grantee: '',
  };
}
/**
 * MsgRevokeAllowance removes any existing Allowance from Granter to Grantee.
 * @name MsgRevokeAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowance
 */
export const MsgRevokeAllowance = {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowance' as const,
  aminoType: 'cosmos-sdk/MsgRevokeAllowance' as const,
  is(o: any): o is MsgRevokeAllowance {
    return (
      o &&
      (o.$typeUrl === MsgRevokeAllowance.typeUrl ||
        (typeof o.granter === 'string' && typeof o.grantee === 'string'))
    );
  },
  isSDK(o: any): o is MsgRevokeAllowanceSDKType {
    return (
      o &&
      (o.$typeUrl === MsgRevokeAllowance.typeUrl ||
        (typeof o.granter === 'string' && typeof o.grantee === 'string'))
    );
  },
  encode(
    message: MsgRevokeAllowance,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(18).string(message.grantee);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRevokeAllowance {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRevokeAllowance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
          break;
        case 2:
          message.grantee = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRevokeAllowance {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
    };
  },
  toJSON(message: MsgRevokeAllowance): JsonSafe<MsgRevokeAllowance> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    return obj;
  },
  fromPartial(object: Partial<MsgRevokeAllowance>): MsgRevokeAllowance {
    const message = createBaseMsgRevokeAllowance();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    return message;
  },
  fromProtoMsg(message: MsgRevokeAllowanceProtoMsg): MsgRevokeAllowance {
    return MsgRevokeAllowance.decode(message.value);
  },
  toProto(message: MsgRevokeAllowance): Uint8Array {
    return MsgRevokeAllowance.encode(message).finish();
  },
  toProtoMsg(message: MsgRevokeAllowance): MsgRevokeAllowanceProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowance',
      value: MsgRevokeAllowance.encode(message).finish(),
    };
  },
};
function createBaseMsgRevokeAllowanceResponse(): MsgRevokeAllowanceResponse {
  return {};
}
/**
 * MsgRevokeAllowanceResponse defines the Msg/RevokeAllowanceResponse response type.
 * @name MsgRevokeAllowanceResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse
 */
export const MsgRevokeAllowanceResponse = {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse' as const,
  aminoType: 'cosmos-sdk/MsgRevokeAllowanceResponse' as const,
  is(o: any): o is MsgRevokeAllowanceResponse {
    return o && o.$typeUrl === MsgRevokeAllowanceResponse.typeUrl;
  },
  isSDK(o: any): o is MsgRevokeAllowanceResponseSDKType {
    return o && o.$typeUrl === MsgRevokeAllowanceResponse.typeUrl;
  },
  encode(
    _: MsgRevokeAllowanceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRevokeAllowanceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRevokeAllowanceResponse();
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
  fromJSON(_: any): MsgRevokeAllowanceResponse {
    return {};
  },
  toJSON(_: MsgRevokeAllowanceResponse): JsonSafe<MsgRevokeAllowanceResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgRevokeAllowanceResponse>,
  ): MsgRevokeAllowanceResponse {
    const message = createBaseMsgRevokeAllowanceResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgRevokeAllowanceResponseProtoMsg,
  ): MsgRevokeAllowanceResponse {
    return MsgRevokeAllowanceResponse.decode(message.value);
  },
  toProto(message: MsgRevokeAllowanceResponse): Uint8Array {
    return MsgRevokeAllowanceResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRevokeAllowanceResponse,
  ): MsgRevokeAllowanceResponseProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse',
      value: MsgRevokeAllowanceResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgPruneAllowances(): MsgPruneAllowances {
  return {
    pruner: '',
  };
}
/**
 * MsgPruneAllowances prunes expired fee allowances.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowances
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowances
 */
export const MsgPruneAllowances = {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgPruneAllowances' as const,
  aminoType: 'cosmos-sdk/MsgPruneAllowances' as const,
  is(o: any): o is MsgPruneAllowances {
    return (
      o &&
      (o.$typeUrl === MsgPruneAllowances.typeUrl ||
        typeof o.pruner === 'string')
    );
  },
  isSDK(o: any): o is MsgPruneAllowancesSDKType {
    return (
      o &&
      (o.$typeUrl === MsgPruneAllowances.typeUrl ||
        typeof o.pruner === 'string')
    );
  },
  encode(
    message: MsgPruneAllowances,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pruner !== '') {
      writer.uint32(10).string(message.pruner);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPruneAllowances {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPruneAllowances();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pruner = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgPruneAllowances {
    return {
      pruner: isSet(object.pruner) ? String(object.pruner) : '',
    };
  },
  toJSON(message: MsgPruneAllowances): JsonSafe<MsgPruneAllowances> {
    const obj: any = {};
    message.pruner !== undefined && (obj.pruner = message.pruner);
    return obj;
  },
  fromPartial(object: Partial<MsgPruneAllowances>): MsgPruneAllowances {
    const message = createBaseMsgPruneAllowances();
    message.pruner = object.pruner ?? '';
    return message;
  },
  fromProtoMsg(message: MsgPruneAllowancesProtoMsg): MsgPruneAllowances {
    return MsgPruneAllowances.decode(message.value);
  },
  toProto(message: MsgPruneAllowances): Uint8Array {
    return MsgPruneAllowances.encode(message).finish();
  },
  toProtoMsg(message: MsgPruneAllowances): MsgPruneAllowancesProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgPruneAllowances',
      value: MsgPruneAllowances.encode(message).finish(),
    };
  },
};
function createBaseMsgPruneAllowancesResponse(): MsgPruneAllowancesResponse {
  return {};
}
/**
 * MsgPruneAllowancesResponse defines the Msg/PruneAllowancesResponse response type.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowancesResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse
 */
export const MsgPruneAllowancesResponse = {
  typeUrl: '/cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse' as const,
  aminoType: 'cosmos-sdk/MsgPruneAllowancesResponse' as const,
  is(o: any): o is MsgPruneAllowancesResponse {
    return o && o.$typeUrl === MsgPruneAllowancesResponse.typeUrl;
  },
  isSDK(o: any): o is MsgPruneAllowancesResponseSDKType {
    return o && o.$typeUrl === MsgPruneAllowancesResponse.typeUrl;
  },
  encode(
    _: MsgPruneAllowancesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPruneAllowancesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPruneAllowancesResponse();
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
  fromJSON(_: any): MsgPruneAllowancesResponse {
    return {};
  },
  toJSON(_: MsgPruneAllowancesResponse): JsonSafe<MsgPruneAllowancesResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgPruneAllowancesResponse>,
  ): MsgPruneAllowancesResponse {
    const message = createBaseMsgPruneAllowancesResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgPruneAllowancesResponseProtoMsg,
  ): MsgPruneAllowancesResponse {
    return MsgPruneAllowancesResponse.decode(message.value);
  },
  toProto(message: MsgPruneAllowancesResponse): Uint8Array {
    return MsgPruneAllowancesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPruneAllowancesResponse,
  ): MsgPruneAllowancesResponseProtoMsg {
    return {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse',
      value: MsgPruneAllowancesResponse.encode(message).finish(),
    };
  },
};
