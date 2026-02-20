//@ts-nocheck
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import {
  Timestamp,
  type TimestampSDKType,
} from '../../../google/protobuf/timestamp.js';
import {
  TransferAuthorization,
  type TransferAuthorizationSDKType,
} from '../../../ibc/applications/transfer/v1/authz.js';
import {
  StakeAuthorization,
  type StakeAuthorizationSDKType,
} from '../../staking/v1beta1/authz.js';
import {
  SendAuthorization,
  type SendAuthorizationSDKType,
} from '../../bank/v1beta1/authz.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { GlobalDecoderRegistry } from '../../../registry.js';
/**
 * GenericAuthorization gives the grantee unrestricted permissions to execute
 * the provided method on behalf of the granter's account.
 * @name GenericAuthorization
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenericAuthorization
 */
export interface GenericAuthorization {
  $typeUrl?: '/cosmos.authz.v1beta1.GenericAuthorization';
  /**
   * Msg, identified by it's type URL, to grant unrestricted permissions to execute
   */
  msg: string;
}
export interface GenericAuthorizationProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization';
  value: Uint8Array;
}
/**
 * GenericAuthorization gives the grantee unrestricted permissions to execute
 * the provided method on behalf of the granter's account.
 * @name GenericAuthorizationSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenericAuthorization
 */
export interface GenericAuthorizationSDKType {
  $typeUrl?: '/cosmos.authz.v1beta1.GenericAuthorization';
  msg: string;
}
/**
 * Grant gives permissions to execute
 * the provide method with expiration time.
 * @name Grant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.Grant
 */
export interface Grant {
  authorization?:
    | (GenericAuthorization &
        TransferAuthorization &
        StakeAuthorization &
        SendAuthorization &
        Any)
    | undefined;
  /**
   * time when the grant will expire and will be pruned. If null, then the grant
   * doesn't have a time expiration (other conditions  in `authorization`
   * may apply to invalidate the grant)
   */
  expiration?: Timestamp;
}
export interface GrantProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.Grant';
  value: Uint8Array;
}
/**
 * Grant gives permissions to execute
 * the provide method with expiration time.
 * @name GrantSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.Grant
 */
export interface GrantSDKType {
  authorization?:
    | GenericAuthorizationSDKType
    | TransferAuthorizationSDKType
    | StakeAuthorizationSDKType
    | SendAuthorizationSDKType
    | AnySDKType
    | undefined;
  expiration?: TimestampSDKType;
}
/**
 * GrantAuthorization extends a grant with both the addresses of the grantee and granter.
 * It is used in genesis.proto and query.proto
 * @name GrantAuthorization
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantAuthorization
 */
export interface GrantAuthorization {
  granter: string;
  grantee: string;
  authorization?:
    | (GenericAuthorization &
        TransferAuthorization &
        StakeAuthorization &
        SendAuthorization &
        Any)
    | undefined;
  expiration?: Timestamp;
}
export interface GrantAuthorizationProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.GrantAuthorization';
  value: Uint8Array;
}
/**
 * GrantAuthorization extends a grant with both the addresses of the grantee and granter.
 * It is used in genesis.proto and query.proto
 * @name GrantAuthorizationSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantAuthorization
 */
export interface GrantAuthorizationSDKType {
  granter: string;
  grantee: string;
  authorization?:
    | GenericAuthorizationSDKType
    | TransferAuthorizationSDKType
    | StakeAuthorizationSDKType
    | SendAuthorizationSDKType
    | AnySDKType
    | undefined;
  expiration?: TimestampSDKType;
}
/**
 * GrantQueueItem contains the list of TypeURL of a sdk.Msg.
 * @name GrantQueueItem
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantQueueItem
 */
export interface GrantQueueItem {
  /**
   * msg_type_urls contains the list of TypeURL of a sdk.Msg.
   */
  msgTypeUrls: string[];
}
export interface GrantQueueItemProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.GrantQueueItem';
  value: Uint8Array;
}
/**
 * GrantQueueItem contains the list of TypeURL of a sdk.Msg.
 * @name GrantQueueItemSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantQueueItem
 */
export interface GrantQueueItemSDKType {
  msg_type_urls: string[];
}
function createBaseGenericAuthorization(): GenericAuthorization {
  return {
    $typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
    msg: '',
  };
}
/**
 * GenericAuthorization gives the grantee unrestricted permissions to execute
 * the provided method on behalf of the granter's account.
 * @name GenericAuthorization
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenericAuthorization
 */
export const GenericAuthorization = {
  typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization' as const,
  aminoType: 'cosmos-sdk/GenericAuthorization' as const,
  is(o: any): o is GenericAuthorization {
    return (
      o &&
      (o.$typeUrl === GenericAuthorization.typeUrl || typeof o.msg === 'string')
    );
  },
  isSDK(o: any): o is GenericAuthorizationSDKType {
    return (
      o &&
      (o.$typeUrl === GenericAuthorization.typeUrl || typeof o.msg === 'string')
    );
  },
  encode(
    message: GenericAuthorization,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.msg !== '') {
      writer.uint32(10).string(message.msg);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GenericAuthorization {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenericAuthorization();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.msg = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenericAuthorization {
    return {
      msg: isSet(object.msg) ? String(object.msg) : '',
    };
  },
  toJSON(message: GenericAuthorization): JsonSafe<GenericAuthorization> {
    const obj: any = {};
    message.msg !== undefined && (obj.msg = message.msg);
    return obj;
  },
  fromPartial(object: Partial<GenericAuthorization>): GenericAuthorization {
    const message = createBaseGenericAuthorization();
    message.msg = object.msg ?? '';
    return message;
  },
  fromProtoMsg(message: GenericAuthorizationProtoMsg): GenericAuthorization {
    return GenericAuthorization.decode(message.value);
  },
  toProto(message: GenericAuthorization): Uint8Array {
    return GenericAuthorization.encode(message).finish();
  },
  toProtoMsg(message: GenericAuthorization): GenericAuthorizationProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
      value: GenericAuthorization.encode(message).finish(),
    };
  },
};
function createBaseGrant(): Grant {
  return {
    authorization: undefined,
    expiration: undefined,
  };
}
/**
 * Grant gives permissions to execute
 * the provide method with expiration time.
 * @name Grant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.Grant
 */
export const Grant = {
  typeUrl: '/cosmos.authz.v1beta1.Grant' as const,
  aminoType: 'cosmos-sdk/Grant' as const,
  is(o: any): o is Grant {
    return o && o.$typeUrl === Grant.typeUrl;
  },
  isSDK(o: any): o is GrantSDKType {
    return o && o.$typeUrl === Grant.typeUrl;
  },
  encode(
    message: Grant,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authorization !== undefined) {
      Any.encode(
        GlobalDecoderRegistry.wrapAny(message.authorization),
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.expiration !== undefined) {
      Timestamp.encode(message.expiration, writer.uint32(18).fork()).ldelim();
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
          message.authorization = GlobalDecoderRegistry.unwrapAny(reader);
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
  fromJSON(object: any): Grant {
    return {
      authorization: isSet(object.authorization)
        ? GlobalDecoderRegistry.fromJSON(object.authorization)
        : undefined,
      expiration: isSet(object.expiration)
        ? fromJsonTimestamp(object.expiration)
        : undefined,
    };
  },
  toJSON(message: Grant): JsonSafe<Grant> {
    const obj: any = {};
    message.authorization !== undefined &&
      (obj.authorization = message.authorization
        ? GlobalDecoderRegistry.toJSON(message.authorization)
        : undefined);
    message.expiration !== undefined &&
      (obj.expiration = fromTimestamp(message.expiration).toISOString());
    return obj;
  },
  fromPartial(object: Partial<Grant>): Grant {
    const message = createBaseGrant();
    message.authorization =
      object.authorization !== undefined && object.authorization !== null
        ? GlobalDecoderRegistry.fromPartial(object.authorization)
        : undefined;
    message.expiration =
      object.expiration !== undefined && object.expiration !== null
        ? Timestamp.fromPartial(object.expiration)
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
      typeUrl: '/cosmos.authz.v1beta1.Grant',
      value: Grant.encode(message).finish(),
    };
  },
};
function createBaseGrantAuthorization(): GrantAuthorization {
  return {
    granter: '',
    grantee: '',
    authorization: undefined,
    expiration: undefined,
  };
}
/**
 * GrantAuthorization extends a grant with both the addresses of the grantee and granter.
 * It is used in genesis.proto and query.proto
 * @name GrantAuthorization
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantAuthorization
 */
export const GrantAuthorization = {
  typeUrl: '/cosmos.authz.v1beta1.GrantAuthorization' as const,
  aminoType: 'cosmos-sdk/GrantAuthorization' as const,
  is(o: any): o is GrantAuthorization {
    return (
      o &&
      (o.$typeUrl === GrantAuthorization.typeUrl ||
        (typeof o.granter === 'string' && typeof o.grantee === 'string'))
    );
  },
  isSDK(o: any): o is GrantAuthorizationSDKType {
    return (
      o &&
      (o.$typeUrl === GrantAuthorization.typeUrl ||
        (typeof o.granter === 'string' && typeof o.grantee === 'string'))
    );
  },
  encode(
    message: GrantAuthorization,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(18).string(message.grantee);
    }
    if (message.authorization !== undefined) {
      Any.encode(
        GlobalDecoderRegistry.wrapAny(message.authorization),
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.expiration !== undefined) {
      Timestamp.encode(message.expiration, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GrantAuthorization {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGrantAuthorization();
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
          message.authorization = GlobalDecoderRegistry.unwrapAny(reader);
          break;
        case 4:
          message.expiration = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GrantAuthorization {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      authorization: isSet(object.authorization)
        ? GlobalDecoderRegistry.fromJSON(object.authorization)
        : undefined,
      expiration: isSet(object.expiration)
        ? fromJsonTimestamp(object.expiration)
        : undefined,
    };
  },
  toJSON(message: GrantAuthorization): JsonSafe<GrantAuthorization> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.authorization !== undefined &&
      (obj.authorization = message.authorization
        ? GlobalDecoderRegistry.toJSON(message.authorization)
        : undefined);
    message.expiration !== undefined &&
      (obj.expiration = fromTimestamp(message.expiration).toISOString());
    return obj;
  },
  fromPartial(object: Partial<GrantAuthorization>): GrantAuthorization {
    const message = createBaseGrantAuthorization();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    message.authorization =
      object.authorization !== undefined && object.authorization !== null
        ? GlobalDecoderRegistry.fromPartial(object.authorization)
        : undefined;
    message.expiration =
      object.expiration !== undefined && object.expiration !== null
        ? Timestamp.fromPartial(object.expiration)
        : undefined;
    return message;
  },
  fromProtoMsg(message: GrantAuthorizationProtoMsg): GrantAuthorization {
    return GrantAuthorization.decode(message.value);
  },
  toProto(message: GrantAuthorization): Uint8Array {
    return GrantAuthorization.encode(message).finish();
  },
  toProtoMsg(message: GrantAuthorization): GrantAuthorizationProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.GrantAuthorization',
      value: GrantAuthorization.encode(message).finish(),
    };
  },
};
function createBaseGrantQueueItem(): GrantQueueItem {
  return {
    msgTypeUrls: [],
  };
}
/**
 * GrantQueueItem contains the list of TypeURL of a sdk.Msg.
 * @name GrantQueueItem
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantQueueItem
 */
export const GrantQueueItem = {
  typeUrl: '/cosmos.authz.v1beta1.GrantQueueItem' as const,
  aminoType: 'cosmos-sdk/GrantQueueItem' as const,
  is(o: any): o is GrantQueueItem {
    return (
      o &&
      (o.$typeUrl === GrantQueueItem.typeUrl ||
        (Array.isArray(o.msgTypeUrls) &&
          (!o.msgTypeUrls.length || typeof o.msgTypeUrls[0] === 'string')))
    );
  },
  isSDK(o: any): o is GrantQueueItemSDKType {
    return (
      o &&
      (o.$typeUrl === GrantQueueItem.typeUrl ||
        (Array.isArray(o.msg_type_urls) &&
          (!o.msg_type_urls.length || typeof o.msg_type_urls[0] === 'string')))
    );
  },
  encode(
    message: GrantQueueItem,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.msgTypeUrls) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GrantQueueItem {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGrantQueueItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.msgTypeUrls.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GrantQueueItem {
    return {
      msgTypeUrls: Array.isArray(object?.msgTypeUrls)
        ? object.msgTypeUrls.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: GrantQueueItem): JsonSafe<GrantQueueItem> {
    const obj: any = {};
    if (message.msgTypeUrls) {
      obj.msgTypeUrls = message.msgTypeUrls.map(e => e);
    } else {
      obj.msgTypeUrls = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GrantQueueItem>): GrantQueueItem {
    const message = createBaseGrantQueueItem();
    message.msgTypeUrls = object.msgTypeUrls?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: GrantQueueItemProtoMsg): GrantQueueItem {
    return GrantQueueItem.decode(message.value);
  },
  toProto(message: GrantQueueItem): Uint8Array {
    return GrantQueueItem.encode(message).finish();
  },
  toProtoMsg(message: GrantQueueItem): GrantQueueItemProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.GrantQueueItem',
      value: GrantQueueItem.encode(message).finish(),
    };
  },
};
