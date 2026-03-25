//@ts-nocheck
import { Plan, type PlanSDKType } from './upgrade.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgSoftwareUpgrade is the Msg/SoftwareUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgrade
 */
export interface MsgSoftwareUpgrade {
  /**
   * authority is the address that controls the module (defaults to x/gov unless overwritten).
   */
  authority: string;
  /**
   * plan is the upgrade plan.
   */
  plan: Plan;
}
export interface MsgSoftwareUpgradeProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade';
  value: Uint8Array;
}
/**
 * MsgSoftwareUpgrade is the Msg/SoftwareUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgradeSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgrade
 */
export interface MsgSoftwareUpgradeSDKType {
  authority: string;
  plan: PlanSDKType;
}
/**
 * MsgSoftwareUpgradeResponse is the Msg/SoftwareUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgradeResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse
 */
export interface MsgSoftwareUpgradeResponse {}
export interface MsgSoftwareUpgradeResponseProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse';
  value: Uint8Array;
}
/**
 * MsgSoftwareUpgradeResponse is the Msg/SoftwareUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgradeResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse
 */
export interface MsgSoftwareUpgradeResponseSDKType {}
/**
 * MsgCancelUpgrade is the Msg/CancelUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgrade
 */
export interface MsgCancelUpgrade {
  /**
   * authority is the address that controls the module (defaults to x/gov unless overwritten).
   */
  authority: string;
}
export interface MsgCancelUpgradeProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.MsgCancelUpgrade';
  value: Uint8Array;
}
/**
 * MsgCancelUpgrade is the Msg/CancelUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgradeSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgrade
 */
export interface MsgCancelUpgradeSDKType {
  authority: string;
}
/**
 * MsgCancelUpgradeResponse is the Msg/CancelUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgradeResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse
 */
export interface MsgCancelUpgradeResponse {}
export interface MsgCancelUpgradeResponseProtoMsg {
  typeUrl: '/cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse';
  value: Uint8Array;
}
/**
 * MsgCancelUpgradeResponse is the Msg/CancelUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgradeResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse
 */
export interface MsgCancelUpgradeResponseSDKType {}
function createBaseMsgSoftwareUpgrade(): MsgSoftwareUpgrade {
  return {
    authority: '',
    plan: Plan.fromPartial({}),
  };
}
/**
 * MsgSoftwareUpgrade is the Msg/SoftwareUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgrade
 */
export const MsgSoftwareUpgrade = {
  typeUrl: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade' as const,
  aminoType: 'cosmos-sdk/MsgSoftwareUpgrade' as const,
  is(o: any): o is MsgSoftwareUpgrade {
    return (
      o &&
      (o.$typeUrl === MsgSoftwareUpgrade.typeUrl ||
        (typeof o.authority === 'string' && Plan.is(o.plan)))
    );
  },
  isSDK(o: any): o is MsgSoftwareUpgradeSDKType {
    return (
      o &&
      (o.$typeUrl === MsgSoftwareUpgrade.typeUrl ||
        (typeof o.authority === 'string' && Plan.isSDK(o.plan)))
    );
  },
  encode(
    message: MsgSoftwareUpgrade,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.plan !== undefined) {
      Plan.encode(message.plan, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSoftwareUpgrade {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSoftwareUpgrade();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.plan = Plan.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSoftwareUpgrade {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      plan: isSet(object.plan) ? Plan.fromJSON(object.plan) : undefined,
    };
  },
  toJSON(message: MsgSoftwareUpgrade): JsonSafe<MsgSoftwareUpgrade> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.plan !== undefined &&
      (obj.plan = message.plan ? Plan.toJSON(message.plan) : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgSoftwareUpgrade>): MsgSoftwareUpgrade {
    const message = createBaseMsgSoftwareUpgrade();
    message.authority = object.authority ?? '';
    message.plan =
      object.plan !== undefined && object.plan !== null
        ? Plan.fromPartial(object.plan)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgSoftwareUpgradeProtoMsg): MsgSoftwareUpgrade {
    return MsgSoftwareUpgrade.decode(message.value);
  },
  toProto(message: MsgSoftwareUpgrade): Uint8Array {
    return MsgSoftwareUpgrade.encode(message).finish();
  },
  toProtoMsg(message: MsgSoftwareUpgrade): MsgSoftwareUpgradeProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
      value: MsgSoftwareUpgrade.encode(message).finish(),
    };
  },
};
function createBaseMsgSoftwareUpgradeResponse(): MsgSoftwareUpgradeResponse {
  return {};
}
/**
 * MsgSoftwareUpgradeResponse is the Msg/SoftwareUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgradeResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse
 */
export const MsgSoftwareUpgradeResponse = {
  typeUrl: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse' as const,
  aminoType: 'cosmos-sdk/MsgSoftwareUpgradeResponse' as const,
  is(o: any): o is MsgSoftwareUpgradeResponse {
    return o && o.$typeUrl === MsgSoftwareUpgradeResponse.typeUrl;
  },
  isSDK(o: any): o is MsgSoftwareUpgradeResponseSDKType {
    return o && o.$typeUrl === MsgSoftwareUpgradeResponse.typeUrl;
  },
  encode(
    _: MsgSoftwareUpgradeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSoftwareUpgradeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSoftwareUpgradeResponse();
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
  fromJSON(_: any): MsgSoftwareUpgradeResponse {
    return {};
  },
  toJSON(_: MsgSoftwareUpgradeResponse): JsonSafe<MsgSoftwareUpgradeResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSoftwareUpgradeResponse>,
  ): MsgSoftwareUpgradeResponse {
    const message = createBaseMsgSoftwareUpgradeResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSoftwareUpgradeResponseProtoMsg,
  ): MsgSoftwareUpgradeResponse {
    return MsgSoftwareUpgradeResponse.decode(message.value);
  },
  toProto(message: MsgSoftwareUpgradeResponse): Uint8Array {
    return MsgSoftwareUpgradeResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSoftwareUpgradeResponse,
  ): MsgSoftwareUpgradeResponseProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse',
      value: MsgSoftwareUpgradeResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgCancelUpgrade(): MsgCancelUpgrade {
  return {
    authority: '',
  };
}
/**
 * MsgCancelUpgrade is the Msg/CancelUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgrade
 */
export const MsgCancelUpgrade = {
  typeUrl: '/cosmos.upgrade.v1beta1.MsgCancelUpgrade' as const,
  aminoType: 'cosmos-sdk/MsgCancelUpgrade' as const,
  is(o: any): o is MsgCancelUpgrade {
    return (
      o &&
      (o.$typeUrl === MsgCancelUpgrade.typeUrl ||
        typeof o.authority === 'string')
    );
  },
  isSDK(o: any): o is MsgCancelUpgradeSDKType {
    return (
      o &&
      (o.$typeUrl === MsgCancelUpgrade.typeUrl ||
        typeof o.authority === 'string')
    );
  },
  encode(
    message: MsgCancelUpgrade,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgCancelUpgrade {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCancelUpgrade();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCancelUpgrade {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
    };
  },
  toJSON(message: MsgCancelUpgrade): JsonSafe<MsgCancelUpgrade> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    return obj;
  },
  fromPartial(object: Partial<MsgCancelUpgrade>): MsgCancelUpgrade {
    const message = createBaseMsgCancelUpgrade();
    message.authority = object.authority ?? '';
    return message;
  },
  fromProtoMsg(message: MsgCancelUpgradeProtoMsg): MsgCancelUpgrade {
    return MsgCancelUpgrade.decode(message.value);
  },
  toProto(message: MsgCancelUpgrade): Uint8Array {
    return MsgCancelUpgrade.encode(message).finish();
  },
  toProtoMsg(message: MsgCancelUpgrade): MsgCancelUpgradeProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.MsgCancelUpgrade',
      value: MsgCancelUpgrade.encode(message).finish(),
    };
  },
};
function createBaseMsgCancelUpgradeResponse(): MsgCancelUpgradeResponse {
  return {};
}
/**
 * MsgCancelUpgradeResponse is the Msg/CancelUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgradeResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse
 */
export const MsgCancelUpgradeResponse = {
  typeUrl: '/cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse' as const,
  aminoType: 'cosmos-sdk/MsgCancelUpgradeResponse' as const,
  is(o: any): o is MsgCancelUpgradeResponse {
    return o && o.$typeUrl === MsgCancelUpgradeResponse.typeUrl;
  },
  isSDK(o: any): o is MsgCancelUpgradeResponseSDKType {
    return o && o.$typeUrl === MsgCancelUpgradeResponse.typeUrl;
  },
  encode(
    _: MsgCancelUpgradeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCancelUpgradeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCancelUpgradeResponse();
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
  fromJSON(_: any): MsgCancelUpgradeResponse {
    return {};
  },
  toJSON(_: MsgCancelUpgradeResponse): JsonSafe<MsgCancelUpgradeResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgCancelUpgradeResponse>): MsgCancelUpgradeResponse {
    const message = createBaseMsgCancelUpgradeResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgCancelUpgradeResponseProtoMsg,
  ): MsgCancelUpgradeResponse {
    return MsgCancelUpgradeResponse.decode(message.value);
  },
  toProto(message: MsgCancelUpgradeResponse): Uint8Array {
    return MsgCancelUpgradeResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCancelUpgradeResponse,
  ): MsgCancelUpgradeResponseProtoMsg {
    return {
      typeUrl: '/cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse',
      value: MsgCancelUpgradeResponse.encode(message).finish(),
    };
  },
};
